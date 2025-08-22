import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { getRecommendedUploadConfig, type UploadBatchProgress, type UploadFileProgress } from '../types/upload';
import { mediaFileService } from '../services/mediaFileService';
import type { ProcessedAudioFile } from '../services/audioFileProcessor';
import { supabase } from '../services/supabase';

export interface R2UploadState {
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

export const useR2UploadStore = create<R2UploadState>((set, get) => ({
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

    // Prepare metadata for R2 upload
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
      // Get metadata for each file to include in R2 upload (parallelized with Promise.all)
      console.log('📊 Fetching metadata for', files.length, 'files...');
      const metadataStartTime = Date.now();
      
      const filesWithMetadata = await Promise.all(
        files.map(async (file, index) => {
          try {
            // Get book OSIS, chapter number, and verse numbers in parallel
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
            console.warn(`⚠️ Failed to get metadata for file ${index + 1}/${files.length} (${file.file.name}), using fallback:`, error);
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
      
      const metadataTime = Date.now() - metadataStartTime;
      console.log(`✅ Metadata fetched in ${metadataTime}ms (${(metadataTime / files.length).toFixed(1)}ms per file)`);

      // Batch create pending media_files rows (much faster than individual inserts)
      console.log('📝 Creating pending media files batch for', filesWithMetadata.length, 'files');
      const startTime = Date.now();
      
      const pendingIds = await mediaFileService.createPendingMediaFilesBatch({
        processedFiles: filesWithMetadata.map(item => item.file),
        projectData,
        userId
      });
      
      const batchTime = Date.now() - startTime;
      console.log(`✅ Created ${pendingIds.length} pending files in ${batchTime}ms (${(batchTime / pendingIds.length).toFixed(1)}ms per file)`);
      console.log('📋 Pending media file IDs:', pendingIds);

      // Get by-id presigned PUT URLs with chunking for large batches
      console.log('🔗 Requesting upload URLs for', pendingIds.length, 'files...');
      const urlStartTime = Date.now();
      
      // Pass original filenames mapping for backend object key generation
      const originalFilenames: Record<string, string> = {};
      filesWithMetadata.forEach((item, index) => {
        originalFilenames[pendingIds[index]] = item.file.file.name;
      });
      
      // For large batches, chunk the URL requests to avoid edge function timeouts
      const urlChunkSize = 25; // Smaller chunks for URL generation
      let allUrlResponses: Array<{ id: string; objectKey: string; uploadUrl: string }> = [];
      
      if (pendingIds.length <= urlChunkSize) {
        // Single request for small batches
        const requestBody = { 
          mediaFileIds: pendingIds, 
          expirationHours: 24,
          originalFilenames
        };
        
        const { data, error } = await supabase.functions.invoke('get-upload-urls-by-id', {
          body: requestBody
        });
        
        if (error) {
          console.error('❌ Edge function error:', error);
          throw new Error(`get-upload-urls-by-id failed: ${error.message}`);
        }
        
        const functionResponse = data?.data;
        const byId = functionResponse as { success: boolean; media?: Array<{ id: string; objectKey: string; uploadUrl: string }>; errors?: Record<string,string> };
        
        if (!byId.success || !byId.media) {
          const errorDetails = Object.entries(byId.errors || {}).map(([id, error]) => `${id}: ${error}`).join('; ');
          throw new Error(`Upload URL generation failed: ${errorDetails}`);
        }
        
        allUrlResponses = byId.media;
      } else {
        // Chunked URL requests for large batches
        console.log(`📊 Using chunked URL requests: ${Math.ceil(pendingIds.length / urlChunkSize)} chunks of ${urlChunkSize} IDs`);
        
        for (let i = 0; i < pendingIds.length; i += urlChunkSize) {
          const chunk = pendingIds.slice(i, i + urlChunkSize);
          const chunkNum = Math.floor(i / urlChunkSize) + 1;
          const totalChunks = Math.ceil(pendingIds.length / urlChunkSize);
          
          console.log(`🔗 Requesting URLs for chunk ${chunkNum}/${totalChunks} (${chunk.length} files)`);
          const chunkStartTime = Date.now();
          
          // Create chunk-specific filename mapping
          const chunkFilenames: Record<string, string> = {};
          chunk.forEach(id => {
            if (originalFilenames[id]) {
              chunkFilenames[id] = originalFilenames[id];
            }
          });
          
          const requestBody = { 
            mediaFileIds: chunk, 
            expirationHours: 24,
            originalFilenames: chunkFilenames
          };
          
          const { data, error } = await supabase.functions.invoke('get-upload-urls-by-id', {
            body: requestBody
          });
          
          if (error) {
            console.error(`❌ Edge function error for chunk ${chunkNum}:`, error);
            throw new Error(`get-upload-urls-by-id failed for chunk ${chunkNum}: ${error.message}`);
          }
          
          const functionResponse = data?.data;
          const byId = functionResponse as { success: boolean; media?: Array<{ id: string; objectKey: string; uploadUrl: string }>; errors?: Record<string,string> };
          
          if (!byId.success || !byId.media || byId.media.length !== chunk.length) {
            const errorDetails = Object.entries(byId.errors || {}).map(([id, error]) => `${id}: ${error}`).join('; ');
            throw new Error(`Upload URL generation failed for chunk ${chunkNum}: ${errorDetails}`);
          }
          
          allUrlResponses.push(...byId.media);
          
          const chunkTime = Date.now() - chunkStartTime;
          console.log(`✅ Chunk ${chunkNum} URLs generated in ${chunkTime}ms (${(chunkTime / chunk.length).toFixed(1)}ms per URL)`);
        }
      }
      
      const urlTime = Date.now() - urlStartTime;
      console.log(`✅ All upload URLs generated in ${urlTime}ms (${(urlTime / pendingIds.length).toFixed(1)}ms per URL)`);
      
      // Validate that we have URLs for all pending IDs
      if (allUrlResponses.length !== pendingIds.length) {
        const missingIds = pendingIds.filter(id => !allUrlResponses.some(m => m.id === id));
        console.error('❌ Missing upload URLs for IDs:', missingIds);
        throw new Error(`Failed to get upload URLs for ${missingIds.length} files: ${missingIds.join(', ')}`);
      }
      
      const idToUpload = new Map<string, { uploadUrl: string }>();
      allUrlResponses.forEach(m => idToUpload.set(m.id, { uploadUrl: m.uploadUrl }));

      // Initialize batch progress and run uploads with optimized concurrency
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
      console.log(`🚀 Starting ${files.length} uploads with ${concurrency} concurrent workers (${totalSizeMB.toFixed(1)}MB total)`);
      const uploadStartTime = Date.now();
      
      // Track completed uploads for batch finalization
      const completedUploads: Array<{ 
        mediaFileId: string; 
        fileSize: number; 
        durationSeconds: number;
      }> = [];
      
      // Throttle progress updates to prevent React infinite loops
      const progressThrottleMap = new Map<string, number>(); // fileName -> lastUpdateTime
      const PROGRESS_THROTTLE_MS = 200; // Update at most every 200ms per file
      console.log(`🚫 Progress throttling enabled: max ${1000 / PROGRESS_THROTTLE_MS} updates/sec per file`);
      
      let idx = 0;
      const worker = async () => {
        while (idx < filesWithMetadata.length) {
          const current = idx++;
          const item = filesWithMetadata[current];
          const id = pendingIds[current];
          const put = idToUpload.get(id)!;
          try {
            // Initialize file progress as uploading (with throttle tracking)
            const fileName = item.file.file.name;
            const initialProgress: UploadFileProgress = { 
              fileName: fileName, 
              fileSize: item.file.file.size, 
              uploadedBytes: 0, 
              status: 'uploading' 
            };
            get().updateFileProgress(initialProgress);
            progressThrottleMap.set(fileName, Date.now()); // Initialize throttle tracking

            // Use XMLHttpRequest for progress tracking with timeout
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              
              // Set reasonable timeout (5 minutes + extra time for large files)
              const timeoutMs = Math.max(300000, (item.file.file.size / (1024 * 1024)) * 30000); // 30s per MB
              xhr.timeout = timeoutMs;
              
              // Track upload progress with throttling to prevent React infinite loops
              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  const now = Date.now();
                  const fileName = item.file.file.name;
                  const lastUpdate = progressThrottleMap.get(fileName) || 0;
                  
                  // Only update if enough time has passed since last update for this file
                  // OR if upload is complete (100%)
                  const isComplete = e.loaded >= e.total;
                  const shouldUpdate = (now - lastUpdate) >= PROGRESS_THROTTLE_MS || isComplete;
                  
                  if (shouldUpdate) {
                    const progressUpdate: UploadFileProgress = {
                      fileName: fileName,
                      fileSize: e.total,
                      uploadedBytes: e.loaded,
                      status: 'uploading'
                    };
                    get().updateFileProgress(progressUpdate);
                    progressThrottleMap.set(fileName, now);
                  }
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
              xhr.onerror = () => reject(new Error('Network error during upload'));
              xhr.onabort = () => reject(new Error('Upload aborted'));
              xhr.ontimeout = () => reject(new Error(`Upload timeout after ${timeoutMs / 1000}s`));
              
              // Start the upload
              xhr.open('PUT', put.uploadUrl);
              xhr.setRequestHeader('Content-Type', item.file.file.type);
              xhr.send(item.file.file);
            });

            // Track successful upload for batch finalization
            completedUploads.push({
              mediaFileId: id,
              fileSize: item.file.file.size,
              durationSeconds: Math.round(item.file.duration)
            });

            const fp: UploadFileProgress = { 
              fileName: item.file.file.name, 
              fileSize: item.file.file.size, 
              uploadedBytes: item.file.file.size, 
              status: 'completed' 
            };
            get().updateFileProgress(fp);
            // Clear throttle tracking for completed files
            progressThrottleMap.delete(item.file.file.name);
            
            // Update the batch progress files array with the completed file
            const fileIndex = batchProgress.files.findIndex(f => f.fileName === item.file.file.name);
            if (fileIndex !== -1) {
              batchProgress.files[fileIndex] = fp;
            }
            batchProgress.completedFiles++;
            get().updateBatchProgress(batchProgress);
            
          } catch (e) {
            const fp: UploadFileProgress = { 
              fileName: item.file.file.name, 
              fileSize: item.file.file.size, 
              uploadedBytes: 0, 
              status: 'failed', 
              error: e instanceof Error ? e.message : 'Upload failed' 
            };
            get().updateFileProgress(fp);
            // Clear throttle tracking for failed files
            progressThrottleMap.delete(item.file.file.name);
            
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

      const uploadTime = Date.now() - uploadStartTime;
      const avgTimePerFile = uploadTime / files.length;
      const totalMBPerSecond = (totalSizeMB / (uploadTime / 1000)).toFixed(2);
      
      console.log(`✅ Upload phase completed in ${uploadTime}ms (${avgTimePerFile.toFixed(1)}ms per file, ${totalMBPerSecond}MB/s)`);

      // Batch finalize all successful uploads
      if (completedUploads.length > 0) {
        console.log(`📝 Finalizing ${completedUploads.length} successful uploads...`);
        const finalizeStartTime = Date.now();
        
        try {
          await mediaFileService.finalizeMediaFilesBatch({ updates: completedUploads });
          const finalizeTime = Date.now() - finalizeStartTime;
          console.log(`✅ Finalized ${completedUploads.length} records in ${finalizeTime}ms`);
        } catch (error) {
          console.error('❌ Batch finalization failed, falling back to individual updates:', error);
          // Fallback to individual finalization
          for (const update of completedUploads) {
            try {
              await mediaFileService.finalizeMediaFile(update);
            } catch (individualError) {
              console.error(`Failed to finalize ${update.mediaFileId}:`, individualError);
            }
          }
        }
      }

      // Invalidate queries for completed uploads
      if (queryClient && projectId && completedUploads.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['media_files_by_project_paginated', projectId] });
        queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info', projectId] });
      }

      const totalTime = Date.now() - metadataStartTime;
      console.log(`🎉 Total upload process completed in ${totalTime}ms for ${files.length} files (${batchProgress.completedFiles} successful, ${batchProgress.failedFiles} failed)`);

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

    // Find the file to update
    const fileIndex = currentBatch.files.findIndex(f => f.fileName === progress.fileName);
    if (fileIndex === -1) return;

    const currentFile = currentBatch.files[fileIndex];
    
    // Skip update if no meaningful change (prevents unnecessary re-renders)
    if (
      currentFile.status === progress.status &&
      currentFile.uploadedBytes === progress.uploadedBytes &&
      currentFile.fileSize === progress.fileSize
    ) {
      return;
    }

    // Create optimized update (only update the changed file)
    const updatedFiles = [...currentBatch.files];
    updatedFiles[fileIndex] = progress;

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

// Export aliases for backward compatibility
export const useB2UploadStore = useR2UploadStore;
export const useUploadStore = useR2UploadStore;

// Export upload warning hook (simple implementation)
export const useUploadWarning = () => {
  return {
    showWarning: false,
    warningMessage: '',
    clearWarning: () => {},
  };
}; 