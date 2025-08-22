import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { getRecommendedUploadConfig, type UploadBatchProgress, type UploadFileProgress } from '../types/upload';
import { supabase } from '../services/supabase';
import type { ProcessedImageFile } from '../types/images';

export interface ImageUploadState {
  // Upload state
  currentBatch: UploadBatchProgress | null;
  isUploading: boolean;
  showProgressToast: boolean;
  
  // Callbacks
  onUploadComplete?: (completedFiles: string[], failedFiles: string[]) => void;
  onBatchComplete?: (batchProgress: UploadBatchProgress) => void;
  
  // Actions
  startUpload: (
    files: ProcessedImageFile[],
    projectData: {
      setId?: string;
      setName?: string;
      createNewSet?: boolean;
    },
    userId: string,
    queryClient?: QueryClient
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

export const useImageUploadStore = create<ImageUploadState>((set, get) => ({
  // Initial state
  currentBatch: null,
  isUploading: false,
  showProgressToast: false,
  onUploadComplete: undefined,
  onBatchComplete: undefined,

  startUpload: async (files, projectData, userId, queryClient) => {
    if (files.length === 0) {
      throw new Error('No files provided for upload');
    }

    set({
      isUploading: true,
      showProgressToast: true,
    });

    try {
      console.log('🚀 Starting R2 by-id image upload for', files.length, 'files');

      // Pre-create pending image rows
      const pendingIds: string[] = [];
      const { ImageService } = await import('../services/imageService');
      const imageService = new ImageService();

      for (const file of files) {
        const id = await imageService.createPendingImage({
          processedFile: file,
          projectData,
          userId,
        });
        pendingIds.push(id);
      }

      console.log(`📝 Created ${pendingIds.length} pending image records.`);

      // Get by-id presigned PUT URLs for images using Supabase client
      console.log('🔗 Requesting upload URLs for image IDs:', pendingIds);
      
      // Pass original filenames mapping for backend object key generation
      const originalFilenames: Record<string, string> = {};
      files.forEach((file, index) => {
        originalFilenames[pendingIds[index]] = file.file.name;
      });
      
      const requestBody = { imageIds: pendingIds, expirationHours: 24, originalFilenames };
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
      
      const byId = functionResponse as { success: boolean; images?: Array<{ id: string; objectKey: string; uploadUrl: string }>; errors?: Record<string,string> };
      
      if (!byId.success || !byId.images || byId.images.length !== pendingIds.length) {
        const errorDetails = Object.entries(byId.errors || {}).map(([id, error]) => `${id}: ${error}`).join('; ');
        const missingIds = pendingIds.filter(id => !byId.images?.some(img => img.id === id));
        console.error('❌ Missing upload URLs for image IDs:', missingIds);
        throw new Error(`Failed to get upload URLs for ${missingIds.length || 'some'} images: ${errorDetails || missingIds.join(', ')}`);
      }
      const idToUpload = new Map<string, { uploadUrl: string }>();
      byId.images.forEach(m => idToUpload.set(m.id, { uploadUrl: m.uploadUrl }));

      // Initialize batch progress and run uploads with limited concurrency
      const totalSizeMB = files.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024);
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
        while (idx < files.length) {
          const current = idx++;
          const file = files[current];
          const id = pendingIds[current];
          const put = idToUpload.get(id)!;
          try {
            // Initialize file progress as uploading
            const initialProgress: UploadFileProgress = { 
              fileName: file.file.name, 
              fileSize: file.file.size, 
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
                    fileName: file.file.name,
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
              xhr.setRequestHeader('Content-Type', file.file.type);
              xhr.send(file.file);
            });

            await imageService.finalizeImage({ imageId: id, fileSize: file.file.size });
            const fp: UploadFileProgress = { fileName: file.file.name, fileSize: file.file.size, uploadedBytes: file.file.size, status: 'completed' };
            get().updateFileProgress(fp);
            
            // Update the batch progress files array with the completed file
            const fileIndex = batchProgress.files.findIndex(f => f.fileName === file.file.name);
            if (fileIndex !== -1) {
              batchProgress.files[fileIndex] = fp;
            }
            batchProgress.completedFiles++;
            get().updateBatchProgress(batchProgress);
            
            if (queryClient) {
              queryClient.invalidateQueries({ queryKey: ['images'] });
              queryClient.invalidateQueries({ queryKey: ['image-sets'] });
            }
          } catch (e) {
            const fp: UploadFileProgress = { fileName: file.file.name, fileSize: file.file.size, uploadedBytes: 0, status: 'failed', error: e instanceof Error ? e.message : 'Upload failed' };
            get().updateFileProgress(fp);
            
            // Update the batch progress files array with the failed file
            const fileIndex = batchProgress.files.findIndex(f => f.fileName === file.file.name);
            if (fileIndex !== -1) {
              batchProgress.files[fileIndex] = fp;
            }
            batchProgress.failedFiles++;
            get().updateBatchProgress(batchProgress);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));

      console.log('✅ By-id image upload completed:', batchProgress);

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
      console.error('❌ Image upload failed:', error);
      
      // Update state on error
      set({
        isUploading: false,
        currentBatch: null,
      });

      throw error;
    }
  },

  cancelUpload: () => {
    console.log('🛑 Image upload cancelled');
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
