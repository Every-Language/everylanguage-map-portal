import { useState, useCallback } from 'react';

export interface UploadProgressData {
  files: Array<{
    name: string;
    fileName: string;
    mediaFileId: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'failed';
    error?: string;
  }>;
  totalProgress: number;
  isUploading: boolean;
  totalFiles: number;
  completedCount: number;
  failedCount: number;
  uploadingCount: number;
  pendingCount: number;
  progress: {
    completed: number;
    failed: number;
    uploading: number;
    pending: number;
    percentage?: number;
    status?: string;
  };
}

export function useUploadProgress() {
  const [progressData, setProgressData] = useState<UploadProgressData>({
    files: [],
    totalProgress: 0,
    isUploading: false,
    totalFiles: 0,
    completedCount: 0,
    failedCount: 0,
    uploadingCount: 0,
    pendingCount: 0,
    progress: {
      completed: 0,
      failed: 0,
      uploading: 0,
      pending: 0,
      percentage: 0,
      status: 'pending',
    },
  });

  const updateProgress = useCallback((data: UploadProgressData) => {
    setProgressData(data);
  }, []);

  const resetProgress = useCallback(() => {
    setProgressData({
      files: [],
      totalProgress: 0,
      isUploading: false,
      totalFiles: 0,
      completedCount: 0,
      failedCount: 0,
      uploadingCount: 0,
      pendingCount: 0,
      progress: {
        completed: 0,
        failed: 0,
        uploading: 0,
        pending: 0,
        percentage: 0,
        status: 'pending',
      },
    });
  }, []);

  return {
    progressData,
    updateProgress,
    resetProgress,
    error: null,
    startTracking: () => {},
    stopTracking: () => {},
    isTracking: false,
  };
} 