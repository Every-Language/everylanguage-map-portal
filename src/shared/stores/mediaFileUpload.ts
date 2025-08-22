import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { getRecommendedUploadConfig, type UploadBatchProgress, type UploadFileProgress } from '../services/directUploadService';
import { mediaFileService } from '../services/mediaFileService';
import type { ProcessedAudioFile } from '../services/audioFileProcessor';
import { supabase } from '../services/supabase';

export interface B2UploadState {
  // Upload state
  currentBatch: UploadBatchProgress | null;
  isUploading: boolean;
  showProgressToast: boolean;
  
  // Callbacks
  onUploadComplete?: (completedFiles: string[], failedFiles: string[]) => void;
  onBatchComplete?: (batchProgress: UploadBatchProgress) => void;
  
  // Actions
  startUpload: (
    files: ProcessedAudioFile[],
    projectData: {
      languageEntityId: string;
      languageEntityName: string;
      audioVersionId: string;
    },
    userId: string,
    queryClient?: QueryClient, // QueryClient instance for table refreshes
    projectId?: string // Project ID for targeted query invalidation
  ) => Promise<void>;
  
  cancelUpload: () => void;
  closeProgressToast: () => void;
  setOnUploadComplete: (callback?: (completedFiles: string[], failedFiles: string[]) => void) => void;
  setOnBatchComplete: (callback?: (batchProgress: UploadBatchProgress) => void) => void;
  
  // Internal actions
  updateBatchProgress: (progress: UploadBatchProgress) => void;
  updateFileProgress: (progress: UploadFileProgress) => void;
  resetUploadState: () => void;
}

export const useB2UploadStore = create<B2UploadState>((set, get) => ({
  // Initial state
  currentBatch: null,
  isUploading: false,
  showProgressToast: false,
  onUploadComplete: undefined,
  onBatchComplete: undefined,

  startUpload: async (files, projectData, userId, queryClient, projectId) => {
    const state = get();
    
    if (state.isUploading) {
      throw new Error('Another upload is already in progress');
    }

    console.log('🚀 Starting R2 by-id upload for', files.length, 'files');

    // Validate all files have required selections
    const invalidFiles = files.filter(f => 
      !f.selectedBookId || 
      !f.selectedChapterId || 
      !f.selectedStartVerseId || 
      !f.selectedEndVerseId
    );

    if (invalidFiles.length > 0) {
      throw new Error(`${invalidFiles.length} files are missing book/chapter/verse selections`);
    }

    // Prepare metadata for B2 upload
    const uploadMetadata = {
      language: projectData.languageEntityName,
    };

    // Set initial upload state
    set({
      isUploading: true,
      showProgressToast: true,
      currentBatch: null,
    });

    try {
      // Get metadata for each file to include in B2 upload
      const filesWithMetadata = await Promise.all(
        files.map(async (file) => {
          try {
            // Get book OSIS, chapter number, and verse numbers
            const [bookOsis, chapterNumber, verseNumbers] = await Promise.all([
              mediaFileService.getBookOsisFromChapter(file.selectedChapterId!),
              mediaFileService.getChapterNumber(file.selectedChapterId!),
              mediaFileService.getVerseNumbers([file.selectedStartVerseId!, file.selectedEndVerseId!])
            ]);

            const startVerse = verseNumbers[file.selectedStartVerseId!];
            const endVerse = verseNumbers[file.selectedEndVerseId!];

            return {
              file,
              metadata: {
                ...uploadMetadata,
                book: bookOsis,
                chapter: chapterNumber.toString(),
                startverse: startVerse.toString(),
                endverse: endVerse.toString(),
              }
            };
          } catch (error) {
            console.error(`Failed to get metadata for file ${file.file.name}:`, error);
            // Use filename parsed data as fallback
            return {
              file,
              metadata: {
                ...uploadMetadata,
                book: file.filenameParseResult.detectedBook || 'unknown',
                chapter: (file.filenameParseResult.detectedChapter || 0).toString(),
                startverse: (file.filenameParseResult.detectedStartVerse || 0).toString(),
                endverse: (file.filenameParseResult.detectedEndVerse || file.filenameParseResult.detectedStartVerse || 0).toString(),
              }
            };
          }
        })
      );

      // Pre-create pending media_files rows
      const pendingIds: string[] = [];
      console.log('📝 Creating pending media files for', filesWithMetadata.length, 'files');
      
      for (const [index, item] of filesWithMetadata.entries()) {
        try {
          const id = await mediaFileService.createPendingMediaFile({ processedFile: item.file, projectData, userId });
          pendingIds.push(id);
          console.log(`✅ Created pending file ${index + 1}/${filesWithMetadata.length}: ${id} (${item.file.file.name})`);
        } catch (error) {
          console.error(`❌ Failed to create pending file ${index + 1}/${filesWithMetadata.length}:`, {
            fileName: item.file.file.name,
            error: error instanceof Error ? error.message : error
          });
          throw error; // Re-throw to stop the upload process
        }
      }
      
      console.log('📋 All pending media files created. IDs:', pendingIds);

      // Get by-id presigned PUT URLs using Supabase client
      console.log('🔗 Requesting upload URLs for IDs:', pendingIds);
      
      // Pass original filenames mapping for backend object key generation
      const originalFilenames: Record<string, string> = {};
      filesWithMetadata.forEach((item, index) => {
        originalFilenames[pendingIds[index]] = item.file.file.name;
      });
      
      const requestBody = { 
        mediaFileIds: pendingIds, 
        expirationHours: 24,
        originalFilenames
      };
      console.log('📤 Request body:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('get-upload-urls-by-id', {
        body: requestBody
      });
      
      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`get-upload-urls-by-id failed: ${error.message}`);
      }
      
      console.log('📄 Raw response:', data);
      
      // Handle the response structure from supabase.functions.invoke() - data is wrapped in a 'data' property
      const functionResponse = data?.data;
      if (!functionResponse) {
        throw new Error('Invalid response format from Edge function');
      }
      
      const byId = functionResponse as { success: boolean; media?: Array<{ id: string; objectKey: string; uploadUrl: string }>; errors?: Record<string,string> };
      
      console.log('📋 Edge function response:', {
        success: byId.success,
        mediaCount: byId.media?.length || 0,
        requestedCount: pendingIds.length,
        errors: byId.errors,
        mediaIds: byId.media?.map(m => m.id) || []
      });
      
      // Enhanced error handling with detailed information
      if (!byId.success) {
        const errorDetails = Object.entries(byId.errors || {}).map(([id, error]) => `${id}: ${error}`).join('; ');
        throw new Error(`Upload URL generation failed for some files: ${errorDetails}`);
      }
      
      if (!byId.media || byId.media.length !== pendingIds.length) {
        const missingIds = pendingIds.filter(id => !byId.media?.some(m => m.id === id));
        console.error('❌ Missing upload URLs for IDs:', missingIds);
        throw new Error(`Failed to get upload URLs for ${missingIds.length} files: ${missingIds.join(', ')}`);
      }
      const idToUpload = new Map<string, { uploadUrl: string }>();
      byId.media.forEach(m => idToUpload.set(m.id, { uploadUrl: m.uploadUrl }));

      // Initialize batch progress and run uploads with limited concurrency
      const totalSizeMB = filesWithMetadata.reduce((sum, f) => sum + f.file.file.size, 0) / (1024 * 1024);
      const recommendedConfig = getRecommendedUploadConfig(files.length, totalSizeMB);
      const batchId = crypto.randomUUID();
      const batchProgress: UploadBatchProgress = {
        batchId,
        totalFiles: files.length,
        completedFiles: 0,
        failedFiles: 0,
        files: files.map(f => ({ fileName: f.file.name, fileSize: f.file.size, uploadedBytes: 0, status: 'pending' })),
      };
      get().updateBatchProgress(batchProgress);

      const concurrency = recommendedConfig.concurrency || 3;
      let idx = 0;
      const worker = async () => {
        while (idx < filesWithMetadata.length) {
          const current = idx++;
          const item = filesWithMetadata[current];
          const id = pendingIds[current];
          const put = idToUpload.get(id)!;
          try {
            // Initialize file progress as uploading
            const initialProgress: UploadFileProgress = { 
              fileName: item.file.file.name, 
              fileSize: item.file.file.size, 
              uploadedBytes: 0, 
              status: 'uploading' 
            };
            get().updateFileProgress(initialProgress);

            // Use XMLHttpRequest for progress tracking
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              
              // Track upload progress
              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  const progressUpdate: UploadFileProgress = {
                    fileName: item.file.file.name,
                    fileSize: e.total,
                    uploadedBytes: e.loaded,
                    status: 'uploading'
                  };
                  get().updateFileProgress(progressUpdate);
                }
              };
              
              // Handle completion
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve();
                } else {
                  reject(new Error(`R2 PUT failed: ${xhr.status} ${xhr.statusText}`));
                }
              };
              
              // Handle errors
              xhr.onerror = () => {
                reject(new Error('Network error during upload'));
              };
              
              // Handle aborts
              xhr.onabort = () => {
                reject(new Error('Upload aborted'));
              };
              
              // Start the upload
              xhr.open('PUT', put.uploadUrl);
              xhr.setRequestHeader('Content-Type', item.file.file.type);
              xhr.send(item.file.file);
            });

            await mediaFileService.finalizeMediaFile({ mediaFileId: id, fileSize: item.file.file.size, durationSeconds: Math.round(item.file.duration) });
            const fp: UploadFileProgress = { fileName: item.file.file.name, fileSize: item.file.file.size, uploadedBytes: item.file.file.size, status: 'completed' };
            get().updateFileProgress(fp);
            
            // Update the batch progress files array with the completed file
            const fileIndex = batchProgress.files.findIndex(f => f.fileName === item.file.file.name);
            if (fileIndex !== -1) {
              batchProgress.files[fileIndex] = fp;
            }
            batchProgress.completedFiles++;
            get().updateBatchProgress(batchProgress);
            if (queryClient && projectId) {
              queryClient.invalidateQueries({ queryKey: ['media_files_by_project_paginated', projectId] });
              queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info', projectId] });
            }
          } catch (e) {
            const fp: UploadFileProgress = { fileName: item.file.file.name, fileSize: item.file.file.size, uploadedBytes: 0, status: 'failed', error: e instanceof Error ? e.message : 'Upload failed' };
            get().updateFileProgress(fp);
            
            // Update the batch progress files array with the failed file
            const fileIndex = batchProgress.files.findIndex(f => f.fileName === item.file.file.name);
            if (fileIndex !== -1) {
              batchProgress.files[fileIndex] = fp;
            }
            batchProgress.failedFiles++;
            get().updateBatchProgress(batchProgress);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, filesWithMetadata.length) }, () => worker()));

      console.log('✅ By-id upload completed:', batchProgress);

      // Call completion callbacks
      const { onUploadComplete, onBatchComplete } = get();
      
      const failedFileNames = batchProgress.files
        .filter(f => f.status === 'failed')
        .map(f => f.fileName);

      const completedFileNames = batchProgress.files
        .filter(f => f.status === 'completed')
        .map(f => f.fileName);
        
      onUploadComplete?.(completedFileNames, failedFileNames);
      onBatchComplete?.(batchProgress);

      // Update final state
      set({
        isUploading: false,
        currentBatch: batchProgress,
      });

    } catch (error) {
      console.error('❌ Upload failed:', error);
      
      // Update state on error
      set({
        isUploading: false,
        currentBatch: null,
      });
      
      throw error;
    }
  },

  cancelUpload: () => {
    // For the by-id R2 flow, we don't keep abort controllers; noop for now.
    set({
      isUploading: false,
      currentBatch: null,
      showProgressToast: false,
    });
  },

  closeProgressToast: () => {
    set({ showProgressToast: false });
  },

  setOnUploadComplete: (callback) => {
    set({ onUploadComplete: callback });
  },

  setOnBatchComplete: (callback) => {
    set({ onBatchComplete: callback });
  },

  updateBatchProgress: (progress) => {
    set({ currentBatch: progress });
  },

  updateFileProgress: (progress) => {
    const { currentBatch } = get();
    if (!currentBatch) return;

    // Update the specific file in the batch
    const updatedFiles = currentBatch.files.map(f => 
      f.fileName === progress.fileName ? progress : f
    );

    const updatedBatch: UploadBatchProgress = {
      ...currentBatch,
      files: updatedFiles,
    };

    set({ currentBatch: updatedBatch });
  },

  resetUploadState: () => {
    set({
      currentBatch: null,
      isUploading: false,
      showProgressToast: false,
      onUploadComplete: undefined,
      onBatchComplete: undefined,
    });
  },
}));

// Export alias for backward compatibility
export const useUploadStore = useB2UploadStore;

// Export upload warning hook (simple implementation)
export const useUploadWarning = () => {
  return {
    showWarning: false,
    warningMessage: '',
    clearWarning: () => {},
  };
}; 