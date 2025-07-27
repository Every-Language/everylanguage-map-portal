import { create } from 'zustand';
import { BulkUploadManager, type BulkUploadFile, type BulkUploadResponse, type BulkUploadProgress } from '../services/bulkUploadService';

export interface UploadState {
  // Audio upload state
  uploadManager: BulkUploadManager | null;
  isUploading: boolean;
  uploadProgress: BulkUploadProgress[];
  showProgress: boolean;
  onUploadComplete?: () => void;
  completionCalled: boolean;
  
  // Text upload state
  isTextUploading: boolean;
  textUploadProgress: {
    completed: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
  } | null;
  showTextProgress: boolean;
  onTextUploadComplete?: () => void;
  textCompletionCalled: boolean;

  // Actions
  startBulkUpload: (files: BulkUploadFile[], authToken: string) => Promise<BulkUploadResponse>;
  updateProgress: (progress: BulkUploadProgress[]) => void;
  clearProgress: () => void;
  setShowProgress: (show: boolean) => void;
  setOnUploadComplete: (callback?: () => void) => void;
  
  // Text upload actions
  startTextUpload: () => void;
  updateTextProgress: (progress: { completed: number; total: number; currentBatch: number; totalBatches: number }) => void;
  completeTextUpload: () => void;
  clearTextProgress: () => void;
  setShowTextProgress: (show: boolean) => void;
  setOnTextUploadComplete: (callback?: () => void) => void;
}

// Global upload manager instance
let globalUploadManager: BulkUploadManager | null = null;

export const useUploadStore = create<UploadState>((set, get) => ({
  // Audio upload state
  uploadManager: null,
  isUploading: false,
  uploadProgress: [],
  showProgress: false,
  onUploadComplete: undefined,
  completionCalled: false,

  // Text upload state
  isTextUploading: false,
  textUploadProgress: null,
  showTextProgress: false,
  onTextUploadComplete: undefined,
  textCompletionCalled: false,

  startBulkUpload: async (files: BulkUploadFile[], authToken: string) => {
    const { isUploading } = get();
    
    if (isUploading) {
      throw new Error('Another upload is already in progress');
    }

    // Create or reuse global upload manager with progress callback
    if (!globalUploadManager) {
      globalUploadManager = new BulkUploadManager((progress) => {
        console.log('📊 Progress update received in store:', progress);
        get().updateProgress(progress);
      });
    }

    // Initialize progress with pending state for all files immediately
    const initialProgress: BulkUploadProgress[] = files.map(file => ({
      mediaFileId: '', // Will be set when response comes back
      fileName: file.metadata.fileName,
      status: 'pending' as const
    }));

    // Set initial state immediately to show progress
    set({
      uploadManager: globalUploadManager,
      isUploading: true,
      uploadProgress: initialProgress,
      showProgress: true,
      completionCalled: false // Reset completion flag for new upload
    });

    try {
      console.log('🚀 Starting global bulk upload with initial progress...', initialProgress);
      
      // Start the upload
      const result = await globalUploadManager.startBulkUpload(files, authToken);
      
      console.log('✅ Bulk upload initiated successfully:', result);
      
      // Update progress with actual media file IDs from response
      if (result.success && result.data?.mediaRecords) {
        const updatedProgress: BulkUploadProgress[] = result.data.mediaRecords.map(record => ({
          mediaFileId: record.mediaFileId,
          fileName: record.fileName,
          status: record.status,
          error: record.error,
          // uploadResult will be populated later when upload completes
        }));
        
        console.log('📋 Updating progress with actual media records:', updatedProgress);
        
        // Use a small delay to ensure database operations complete before updating
        setTimeout(() => {
          get().updateProgress(updatedProgress);
        }, 100);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Global bulk upload failed:', error);
      
      // Reset state on error
      set({
        isUploading: false,
        uploadManager: null,
        showProgress: false,
        uploadProgress: []
      });
      
      throw error;
    }
  },

  updateProgress: (progress: BulkUploadProgress[]) => {
    console.log('🔄 Updating progress in store:', progress);
    
    // Ensure we preserve the current state if progress is empty
    const currentState = get();
    const newProgress = progress.length > 0 ? progress : currentState.uploadProgress;
    
    set({ uploadProgress: newProgress });
    
    // Check if all uploads are complete
    const allComplete = newProgress.length > 0 && newProgress.every(
      p => p.status === 'completed' || p.status === 'failed'
    );

    if (allComplete) {
      console.log('🎉 All uploads completed, updating state');
      
      set({
        isUploading: false,
        uploadManager: null
      });
      
      // Call external completion callback if provided
      const { onUploadComplete } = currentState;
      if (onUploadComplete && !currentState.completionCalled) {
        console.log('📞 Calling external upload completion callback');
        onUploadComplete();
        set({ completionCalled: true }); // Mark completion as called
      }
      
      // Clear the global manager after a delay to allow UI updates
      setTimeout(() => {
        if (globalUploadManager) {
          globalUploadManager.cleanup();
          globalUploadManager = null;
        }
      }, 2000);
    }
  },

  clearProgress: () => {
    console.log('🧹 Clearing upload progress');
    set({
      uploadProgress: [],
      showProgress: false,
      isUploading: false,
      uploadManager: null,
      onUploadComplete: undefined,
      completionCalled: false
    });
    
    if (globalUploadManager) {
      globalUploadManager.cleanup();
      globalUploadManager = null;
    }
  },

  setShowProgress: (show: boolean) => {
    set({ showProgress: show });
  },

  setOnUploadComplete: (callback?: () => void) => {
    set({ onUploadComplete: callback });
  },

  // Text upload methods
  startTextUpload: () => {
    console.log('🚀 Starting text upload')
    set({
      isTextUploading: true,
      textUploadProgress: null,
      showTextProgress: true,
      textCompletionCalled: false
    })
  },

  updateTextProgress: (progress) => {
    console.log('📊 Updating text upload progress:', progress)
    set({ textUploadProgress: progress })
  },

  completeTextUpload: () => {
    console.log('🎉 Text upload completed')
    
    const currentState = get()
    set({
      isTextUploading: false,
      textUploadProgress: null
    })
    
    // Call external completion callback if provided
    const { onTextUploadComplete } = currentState
    if (onTextUploadComplete && !currentState.textCompletionCalled) {
      console.log('📞 Calling external text upload completion callback')
      onTextUploadComplete()
      set({ textCompletionCalled: true })
    }
  },

  clearTextProgress: () => {
    console.log('🧹 Clearing text upload progress')
    set({
      isTextUploading: false,
      textUploadProgress: null,
      showTextProgress: false,
      onTextUploadComplete: undefined,
      textCompletionCalled: false
    })
  },

  setShowTextProgress: (show: boolean) => {
    set({ showTextProgress: show })
  },

  setOnTextUploadComplete: (callback?: () => void) => {
    set({ onTextUploadComplete: callback })
  },
}));

// Helper hook for beforeunload warning
export const useUploadWarning = () => {
  const isUploading = useUploadStore(state => state.isUploading);
  
  // Set up beforeunload warning
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = 'Files are still uploading. Are you sure you want to leave?';
        return 'Files are still uploading. Are you sure you want to leave?';
      }
    };

    if (isUploading) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      console.log('🔒 Upload warning enabled');
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (!isUploading) {
        console.log('🔓 Upload warning disabled');
      }
    };
  }, [isUploading]);

  return { isUploading };
};

// Add React import for the hook
import React from 'react';