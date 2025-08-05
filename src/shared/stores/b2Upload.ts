import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { b2UploadService, getRecommendedUploadConfig, type UploadBatchProgress, type UploadFileProgress } from '../services/b2DirectUploadService';
import { mediaFileService, type MediaFileCreateRequest } from '../services/mediaFileService';
import type { ProcessedAudioFile } from '../services/audioFileProcessor';

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

    console.log('🚀 Starting B2 direct upload for', files.length, 'files');

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

      // Start B2 upload with file-by-file database record creation
      console.log('🚀 Starting B2 upload with immediate database record creation');
      
      // Calculate optimal upload configuration based on batch characteristics
      const totalSizeMB = filesWithMetadata.reduce((sum, f) => sum + f.file.file.size, 0) / (1024 * 1024);
      const recommendedConfig = getRecommendedUploadConfig(files.length, totalSizeMB);
      
      console.log(`📊 Upload batch info: ${files.length} files, ${totalSizeMB.toFixed(1)}MB total, recommended concurrency: ${recommendedConfig.concurrency}`);
      
      const batchProgress = await b2UploadService.uploadFiles(
        filesWithMetadata.map(f => f.file),
        uploadMetadata,
        (progress) => {
          get().updateBatchProgress(progress);
        },
        async (fileProgress) => {
          get().updateFileProgress(fileProgress);
          
          // Create database record immediately when a file completes successfully
          if (fileProgress.status === 'completed' && fileProgress.remotePath) {
            try {
              const originalFileData = filesWithMetadata.find(f => f.file.file.name === fileProgress.fileName);
              if (originalFileData) {
                console.log(`📝 Creating database record for completed file: ${fileProgress.fileName}`);
                
                const mediaFileRequest: MediaFileCreateRequest = {
                  processedFile: originalFileData.file,
                  uploadResult: fileProgress,
                  projectData,
                  userId,
                };
                
                const mediaFileId = await mediaFileService.createMediaFile(mediaFileRequest);
                console.log(`✅ Created database record for ${fileProgress.fileName}: ${mediaFileId}`);
                
                // 🔄 IMMEDIATE TABLE REFRESH: Show the new record in the audio files table instantly
                // This provides real-time feedback as each file completes uploading
                if (queryClient && projectId) {
                  console.log(`🔄 Refreshing audio files table for project ${projectId}, new record: ${fileProgress.fileName}`);
                  
                  // Invalidate specific project queries for targeted refresh
                  queryClient.invalidateQueries({
                    queryKey: ['media_files_by_project_paginated', projectId]
                  });
                  queryClient.invalidateQueries({
                    queryKey: ['media_files_with_verse_info', projectId]
                  });
                  
                  // Also trigger immediate refetch to show the new record immediately
                  queryClient.refetchQueries({
                    queryKey: ['media_files_by_project_paginated', projectId]
                  });
                }
                
                // Remove the optimistic upload since we now have real data
                // This will trigger a refresh through the real-time subscription
              } else {
                console.warn(`⚠️ Could not find original file data for ${fileProgress.fileName}`);
              }
            } catch (error) {
              console.error(`❌ Failed to create database record for ${fileProgress.fileName}:`, error);
              // Don't fail the entire upload process if database creation fails
            }
          }
        },
        {
          concurrent: true, // Enable concurrent uploads for better efficiency
          concurrency: recommendedConfig.concurrency || 3 // Use recommended concurrency
        }
      );

      console.log('✅ B2 upload completed:', batchProgress);

      // Note: Database records are now created during upload, not after
      console.log(`📊 Upload summary: ${batchProgress.completedFiles} completed, ${batchProgress.failedFiles} failed`);

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
    const { currentBatch } = get();
    
    if (currentBatch) {
      console.log('🛑 Cancelling upload batch:', currentBatch.batchId);
      b2UploadService.cancelBatch(currentBatch.batchId);
    }
    
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