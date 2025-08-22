// Upload progress tracking types for R2/Cloudflare uploads
export interface UploadFileProgress {
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'retrying' | 'paused';
  error?: string;
  remotePath?: string;
  r2ObjectKey?: string;
  duration?: number;
  retryCount?: number;
  lastRetryAt?: number;
  uploadSpeed?: number; // bytes per second
  eta?: number; // estimated time remaining in seconds
  isStalled?: boolean;
}

export interface UploadBatchProgress {
  batchId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  files: UploadFileProgress[];
  startTime?: number;
  endTime?: number;
  totalRetries?: number;
  isPaused?: boolean;
  networkStatus?: 'online' | 'offline' | 'slow';
}

// Upload configuration
export interface UploadConfig {
  batchSize: number;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
  maxRetryDelay: number;
  timeoutPerMB: number; // Timeout per MB in milliseconds
  enableResumption: boolean;
  enableProgressPersistence: boolean;
  chunkSize: number; // For large file chunking
  stallThreshold: number; // Seconds without progress before considering stalled
}

/**
 * Get recommended upload configuration based on file count and total size
 */
export function getRecommendedUploadConfig(fileCount: number, totalSizeMB: number): Partial<UploadConfig> {
  // For small batches (< 5 files), use higher concurrency
  if (fileCount <= 5) {
    return { concurrency: 3 };
  }
  
  // For medium batches (5-20 files), use moderate concurrency
  if (fileCount <= 20) {
    return { concurrency: 4 };
  }
  
  // For large batches (> 20 files), use higher concurrency but be mindful of server load
  if (fileCount > 20) {
    return { concurrency: 5 };
  }
  
  // For very large files (> 50MB each), reduce concurrency to avoid memory issues
  if (totalSizeMB / fileCount > 50) {
    return { concurrency: 2 };
  }
  
  return { concurrency: 3 };
}
