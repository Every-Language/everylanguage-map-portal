import { create } from 'zustand';
import { BulkUploadManager, type BulkUploadFile, type BulkUploadResponse, type BulkUploadProgress } from '../services/bulkUploadService';
import { useEffect } from 'react';

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
  startBulkUpload: (files: BulkUploadFile[], authToken: string, projectId: string) => Promise<BulkUploadResponse>;
  resumeUploads: (projectId: string) => Promise<void>;
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

  startBulkUpload: async (files: BulkUploadFile[], authToken: string, projectId: string) => {
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
      console.log('🚀 Starting bulk upload via store with', files.length, 'files');
      const result = await globalUploadManager.startBulkUpload(files, authToken, projectId);
      
      console.log('✅ Bulk upload initiated successfully');
      return result;

    } catch (error) {
      console.error('❌ Bulk upload failed:', error);
      
      // Reset state on failure
      set({
        isUploading: false,
        uploadProgress: []
      });
      
      throw error;
    }
  },

  resumeUploads: async (projectId: string) => {
    console.log('🔄 Attempting to resume uploads for project:', projectId);
    
    try {
      const resumedManager = await BulkUploadManager.resumeExistingUploads(
        projectId,
        (progress) => {
          console.log('📊 Resumed progress update:', progress);
          get().updateProgress(progress);
        }
      );

      if (resumedManager) {
        console.log('✅ Successfully resumed upload tracking');
        
        set({
          uploadManager: resumedManager,
          isUploading: true,
          showProgress: true,
          completionCalled: false
        });

        // Update global manager reference
        globalUploadManager = resumedManager;
      } else {
        console.log('ℹ️ No uploads to resume');
      }
    } catch (error) {
      console.error('❌ Failed to resume uploads:', error);
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

  // Text upload methods remain the same
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
  const { isUploading } = useUploadStore();
  
  useEffect(() => {
    if (!isUploading) {
      console.log('🔓 Upload warning disabled');
      return;
    }

    console.log('🔒 Upload warning enabled');
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = 'You have uploads in progress. Are you sure you want to leave?');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);
};