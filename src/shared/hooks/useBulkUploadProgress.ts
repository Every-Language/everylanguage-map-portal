import { useState, useEffect, useCallback, useRef } from 'react';
import { BulkUploadManager, type BulkUploadProgress } from '../services/bulkUploadService';

interface UseBulkUploadProgressOptions {
  autoCleanup?: boolean; // Whether to auto-cleanup when all uploads complete
  showPageLeaveWarning?: boolean; // Whether to show page leave warning during uploads
}

interface UploadSummary {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  uploading: number;
  isComplete: boolean;
}

export function useBulkUploadProgress(options: UseBulkUploadProgressOptions = {}) {
  const { autoCleanup = true, showPageLeaveWarning = true } = options;
  
  const [progress, setProgress] = useState<BulkUploadProgress[]>([]);
  const [isActive, setIsActive] = useState(false);
  const uploadManagerRef = useRef<BulkUploadManager | null>(null);

  // Calculate summary from progress
  const summary: UploadSummary = {
    total: progress.length,
    completed: progress.filter(p => p.status === 'completed').length,
    failed: progress.filter(p => p.status === 'failed').length,
    pending: progress.filter(p => p.status === 'pending').length,
    uploading: progress.filter(p => p.status === 'uploading').length,
    isComplete: progress.length > 0 && progress.every(p => p.status === 'completed' || p.status === 'failed')
  };

  // Handle progress updates from upload manager
  const handleProgressUpdate = useCallback((newProgress: BulkUploadProgress[]) => {
    setProgress(newProgress);
    
    // Check if uploads are complete
    const allComplete = newProgress.length > 0 && newProgress.every(
      p => p.status === 'completed' || p.status === 'failed'
    );
    
    if (allComplete && autoCleanup) {
      setIsActive(false);
      // Cleanup will happen in the effect below
    }
  }, [autoCleanup]);

  // Create and manage upload manager
  const startTracking = useCallback((uploadManager: BulkUploadManager) => {
    // Clean up previous manager if exists
    if (uploadManagerRef.current) {
      uploadManagerRef.current.cleanup();
    }
    
    uploadManagerRef.current = uploadManager;
    setIsActive(true);
    
    // Set up progress callback
    uploadManager.progressCallback = handleProgressUpdate;
    
    // Get initial progress if available
    const initialProgress = uploadManager.getProgress();
    if (initialProgress.length > 0) {
      setProgress(initialProgress);
    }
  }, [handleProgressUpdate]);

  // Stop tracking and cleanup
  const stopTracking = useCallback(() => {
    if (uploadManagerRef.current) {
      uploadManagerRef.current.cleanup();
      uploadManagerRef.current = null;
    }
    setIsActive(false);
    setProgress([]);
  }, []);

  // Reset progress state
  const resetProgress = useCallback(() => {
    setProgress([]);
    setIsActive(false);
  }, []);

  // Page leave warning effect
  useEffect(() => {
    if (!showPageLeaveWarning || !isActive || summary.isComplete) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasActiveUploads = progress.some(p => p.status === 'pending' || p.status === 'uploading');
      
      if (hasActiveUploads) {
        event.preventDefault();
        event.returnValue = 'Files are still uploading. Are you sure you want to leave?';
        return 'Files are still uploading. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [showPageLeaveWarning, isActive, summary.isComplete, progress]);

  // Cleanup effect when component unmounts or tracking stops
  useEffect(() => {
    if (summary.isComplete && autoCleanup && uploadManagerRef.current) {
      const timer = setTimeout(() => {
        stopTracking();
      }, 2000); // Wait 2 seconds after completion before cleanup
      
      return () => clearTimeout(timer);
    }
  }, [summary.isComplete, autoCleanup, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (uploadManagerRef.current) {
        uploadManagerRef.current.cleanup();
      }
    };
  }, []);

  // Get specific file progress
  const getFileProgress = useCallback((mediaFileId: string): BulkUploadProgress | undefined => {
    return progress.find(p => p.mediaFileId === mediaFileId);
  }, [progress]);

  // Get files by status
  const getFilesByStatus = useCallback((status: BulkUploadProgress['status']): BulkUploadProgress[] => {
    return progress.filter(p => p.status === status);
  }, [progress]);

  // Check if a specific file is uploading
  const isFileUploading = useCallback((mediaFileId: string): boolean => {
    const fileProgress = getFileProgress(mediaFileId);
    return fileProgress?.status === 'uploading' || fileProgress?.status === 'pending';
  }, [getFileProgress]);

  return {
    // State
    progress,
    summary,
    isActive,
    
    // Actions
    startTracking,
    stopTracking,
    resetProgress,
    
    // Utilities
    getFileProgress,
    getFilesByStatus,
    isFileUploading,
    
    // Status checks
    hasActiveUploads: summary.pending > 0 || summary.uploading > 0,
    isComplete: summary.isComplete,
    hasFailures: summary.failed > 0,
  };
}

// Helper hook for managing upload state in components
export function useUploadState() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const startUpload = useCallback(() => {
    setIsUploading(true);
    setUploadError(null);
  }, []);

  const finishUpload = useCallback(() => {
    setIsUploading(false);
  }, []);

  const setError = useCallback((error: string | null) => {
    setUploadError(error);
    if (error) {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadError(null);
  }, []);

  return {
    isUploading,
    uploadError,
    startUpload,
    finishUpload,
    setError,
    reset,
  };
} 