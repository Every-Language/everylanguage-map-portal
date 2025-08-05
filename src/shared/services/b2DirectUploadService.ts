import { supabase } from './supabase';
import type { ProcessedAudioFile } from './audioFileProcessor';

// Types for the get-upload-urls API
export interface UploadUrlRequest {
  fileName: string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface UploadUrlResponse {
  fileName: string;
  b2FileName: string;
  remotePath: string;
  uploadUrl: string;
  authorizationToken: string;
  contentType: string;
  expiresIn: number;
}

export interface GetUploadUrlsRequest {
  files: UploadUrlRequest[];
  batchId?: string;
  concurrency?: number;
}

export interface GetUploadUrlsResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    batchId: string;
    urls: UploadUrlResponse[];
    uploadMetadata: {
      maxFileSize: number;
      validForHours: number;
      instructions: string;
    };
  };
  error?: string;
}

// Types for upload progress tracking
export interface UploadFileProgress {
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'retrying' | 'paused';
  error?: string;
  remotePath?: string;
  b2FileName?: string;
  duration?: number;
  retryCount?: number;
  lastRetryAt?: number;
  uploadSpeed?: number; // bytes per second
  eta?: number; // estimated time remaining in seconds
  isStalled?: boolean;
  resumeData?: {
    uploadId: string;
    chunkIndex: number;
    chunkSize: number;
    uploadedChunks: number[];
  };
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

export interface PersistedUploadState {
  batchId: string;
  timestamp: number;
  batchProgress: UploadBatchProgress;
  config: UploadConfig;
  metadata: Record<string, string>;
}

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: number;
  error: string;
  willRetry: boolean;
}

/**
 * Network monitoring utility for upload resilience
 */
class NetworkMonitor {
  private isOnline: boolean = navigator.onLine;
  private listeners: ((status: 'online' | 'offline' | 'slow') => void)[] = [];
  private speedTest: {
    isRunning: boolean;
    lastSpeed: number;
    threshold: number; // bytes per second for "slow" connection
  } = {
    isRunning: false,
    lastSpeed: 0,
    threshold: 100 * 1024 // 100 KB/s threshold for slow connection
  };

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });
  }

  getStatus(): 'online' | 'offline' | 'slow' {
    if (!this.isOnline) return 'offline';
    if (this.speedTest.lastSpeed > 0 && this.speedTest.lastSpeed < this.speedTest.threshold) {
      return 'slow';
    }
    return 'online';
  }

  onStatusChange(callback: (status: 'online' | 'offline' | 'slow') => void) {
    this.listeners.push(callback);
  }

  private notifyListeners(status: 'online' | 'offline' | 'slow') {
    this.listeners.forEach(listener => listener(status));
  }

  updateSpeed(bytesPerSecond: number) {
    this.speedTest.lastSpeed = bytesPerSecond;
    const status = this.getStatus();
    this.notifyListeners(status);
  }
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

const DEFAULT_CONFIG: UploadConfig = {
  batchSize: 50, // Max files per get-upload-urls request
  concurrency: parseInt(import.meta.env.VITE_UPLOAD_CONCURRENCY || '5'), // Max concurrent uploads per batch
  retryAttempts: 3,
  retryDelay: 1000,
  maxRetryDelay: 30000, // 30 seconds max retry delay
  timeoutPerMB: 120000, // 2 minutes per MB
  enableResumption: true,
  enableProgressPersistence: true,
  chunkSize: 10 * 1024 * 1024, // 10MB chunks for large files
  stallThreshold: 30, // 30 seconds without progress
};

export class B2DirectUploadService {
  private config: UploadConfig;
  private abortControllers: Map<string, AbortController> = new Map();
  private persistedStates: Map<string, PersistedUploadState> = new Map();
  private retryHistory: Map<string, RetryAttempt[]> = new Map();
  private networkMonitor: NetworkMonitor;

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.networkMonitor = new NetworkMonitor();
    
    // Load persisted upload states on initialization
    if (this.config.enableProgressPersistence) {
      this.loadPersistedStates();
    }
  }

  /**
   * Get upload URLs from the backend function
   */
  async getUploadUrls(
    files: ProcessedAudioFile[],
    metadata: Record<string, string> = {}
  ): Promise<GetUploadUrlsResponse> {
    console.log(`🔗 Requesting upload URLs for ${files.length} files...`);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No authentication session found');
      throw new Error('No authentication session found');
    }

    console.log(`✅ Authentication session found, token expires at: ${session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'}`);

    // Prepare request payload
    const requestFiles: UploadUrlRequest[] = files.map(file => ({
      fileName: file.file.name,
      contentType: file.file.type,
      metadata: {
        ...metadata,
        originalSize: file.file.size.toString(),
        duration: file.duration.toString(),
      }
    }));

    console.log(`📋 Request files:`, requestFiles.map(f => ({
      fileName: f.fileName,
      contentType: f.contentType,
      metadataKeys: Object.keys(f.metadata || {})
    })));

    const requestBody: GetUploadUrlsRequest = {
      files: requestFiles,
      concurrency: this.config.concurrency,
    };

    console.log(`📤 Request payload:`, {
      filesCount: requestBody.files.length,
      concurrency: requestBody.concurrency,
      hasMetadata: Object.keys(metadata).length > 0
    });

    // Call the get-upload-urls function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const endpoint = `${supabaseUrl}/functions/v1/get-upload-urls`;
    
    console.log(`🌐 Making request to: ${endpoint}`);
    console.log(`🔑 Using auth token (first 10 chars): ${session.access_token.substring(0, 10)}...`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`📥 Response status: ${response.status} ${response.statusText}`);
      console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to get upload URLs:`, {
          status: response.status,
          statusText: response.statusText,
          errorText,
          endpoint
        });
        throw new Error(`Failed to get upload URLs: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully got upload URLs:`, {
        success: result.success,
        totalFiles: result.data?.totalFiles,
        batchId: result.data?.batchId,
        urlsCount: result.data?.urls?.length,
        expiresIn: result.data?.uploadMetadata?.validForHours
      });

      // Validate the response structure
      if (!result.success || !result.data || !result.data.urls) {
        console.error(`❌ Invalid response structure:`, result);
        throw new Error('Invalid response structure from get-upload-urls');
      }

      // Validate each upload URL
      result.data.urls.forEach((url: UploadUrlResponse, index: number) => {
        if (!url.uploadUrl || !url.authorizationToken || !url.b2FileName) {
          console.error(`❌ Invalid upload URL at index ${index}:`, {
            hasUploadUrl: !!url.uploadUrl,
            hasAuthToken: !!url.authorizationToken,
            hasB2FileName: !!url.b2FileName,
            fileName: url.fileName
          });
        } else {
          console.log(`✅ Valid upload URL for ${url.fileName}:`, {
            uploadUrlDomain: new URL(url.uploadUrl).hostname,
            authTokenPrefix: url.authorizationToken.substring(0, 10) + '...',
            b2FileName: url.b2FileName,
            expiresIn: url.expiresIn
          });
        }
      });

      return result;

    } catch (error) {
      console.error(`💥 Error getting upload URLs:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint,
        hasAuth: !!session.access_token
      });
      throw error;
    }
  }

  /**
   * Upload a single file directly to B2 with retry logic and resilience
   */
  async uploadFileToB2(
    file: File,
    uploadInfo: UploadUrlResponse,
    onProgress?: (progress: UploadFileProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<UploadFileProgress> {
    return this.uploadFileToB2WithRetry(file, uploadInfo, onProgress, abortSignal, 0);
  }

  /**
   * Enhanced upload with comprehensive retry logic, resumption, and error resilience
   */
  private async uploadFileToB2WithRetry(
    file: File,
    uploadInfo: UploadUrlResponse,
    onProgress?: (progress: UploadFileProgress) => void,
    abortSignal?: AbortSignal,
    retryCount: number = 0
  ): Promise<UploadFileProgress> {
    const startTime = Date.now();
    const fileId = `${file.name}-${file.lastModified}-${file.size}`;
    
    const fileProgress: UploadFileProgress = {
      fileName: file.name,
      fileSize: file.size,
      uploadedBytes: 0,
      status: retryCount > 0 ? 'retrying' : 'uploading',
      remotePath: uploadInfo.remotePath,
      b2FileName: uploadInfo.b2FileName,
      retryCount,
      lastRetryAt: retryCount > 0 ? Date.now() : undefined,
      uploadSpeed: 0,
      eta: 0,
      isStalled: false,
    };

    onProgress?.(fileProgress);

    try {
      const attemptPrefix = retryCount > 0 ? `🔄 Retry ${retryCount}` : '🚀 Initial upload';
      console.log(`${attemptPrefix} for file: ${file.name}`);
      console.log(`📊 Upload URL: ${uploadInfo.uploadUrl}`);
      console.log(`🔑 Has auth token: ${!!uploadInfo.authorizationToken}`);
      console.log(`📄 Content type: ${uploadInfo.contentType}`);
      console.log(`📁 B2 filename: ${uploadInfo.b2FileName}`);

      // Check network status before upload
      const networkStatus = this.networkMonitor.getStatus();
      if (networkStatus === 'offline') {
        throw new Error('Network is offline');
      }

      // Calculate SHA1 hash (cache it for retries)
      console.log(`🔍 Calculating SHA1 hash for ${file.name}...`);
      const sha1Hash = await this.calculateSHA1(file);
      console.log(`✅ SHA1 calculated: ${sha1Hash}`);

      // Perform the upload with enhanced tracking
      await this.performResilientUpload(
        file, 
        uploadInfo, 
        sha1Hash, 
        fileProgress, 
        onProgress, 
        abortSignal
      );

      // Success
      fileProgress.status = 'completed';
      fileProgress.uploadedBytes = file.size;
      fileProgress.eta = 0;
      const totalTime = (Date.now() - startTime) / 1000;
      console.log(`🎉 Upload completed for ${file.name} in ${totalTime.toFixed(1)}s with ${retryCount} retries`);
      onProgress?.(fileProgress);
      
      // Clean up retry history on success
      this.retryHistory.delete(fileId);
      
      return fileProgress;

    } catch (error) {
      console.error(`💥 Upload error for ${file.name} (attempt ${retryCount + 1}):`, error);
      
      // Record retry attempt
      this.recordRetryAttempt(fileId, retryCount + 1, error);
      
      // Check if we should retry
      if (retryCount < this.config.retryAttempts && 
          this.isRetryableError(error) && 
          !abortSignal?.aborted &&
          this.networkMonitor.getStatus() !== 'offline') {
        
        const delay = this.calculateRetryDelay(retryCount);
        console.log(`⏳ Retrying upload for ${file.name} in ${delay}ms (attempt ${retryCount + 2}/${this.config.retryAttempts + 1})`);
        
        // Update progress to show retry status
        fileProgress.status = 'retrying';
        fileProgress.retryCount = retryCount + 1;
        fileProgress.lastRetryAt = Date.now();
        onProgress?.(fileProgress);
        
        // Wait before retry
        await this.sleep(delay);
        
        // Check if we need a fresh upload URL for certain errors
        const retryUploadInfo = uploadInfo;
        if (this.needsFreshUrl(error)) {
          console.log(`🔄 Getting fresh upload URL for retry: ${file.name}`);
          // Note: This would require calling getUploadUrls again from the parent
          // For now, we'll use the same URL and let the backend handle token refresh
        }
        
        // Recursive retry
        return this.uploadFileToB2WithRetry(file, retryUploadInfo, onProgress, abortSignal, retryCount + 1);
      }
      
      // Max retries exceeded or non-retryable error
      fileProgress.status = 'failed';
      fileProgress.error = error instanceof Error ? error.message : 'Unknown error';
      fileProgress.retryCount = retryCount;
      onProgress?.(fileProgress);
      throw error;
    }
  }

  /**
   * Perform resilient upload with enhanced progress tracking and stall detection
   */
  private async performResilientUpload(
    file: File,
    uploadInfo: UploadUrlResponse,
    sha1Hash: string,
    fileProgress: UploadFileProgress,
    onProgress?: (progress: UploadFileProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Calculate dynamic timeout based on file size
      const timeoutMs = Math.max(
        300000, // 5 minutes minimum
        (file.size / (1024 * 1024)) * this.config.timeoutPerMB
      );
      xhr.timeout = timeoutMs;
      
      // Progress tracking with stall detection
      let lastProgressTime = Date.now();
      let lastUploadedBytes = 0;
      let stallCheckInterval: NodeJS.Timeout | null = null;
      
      // Set up abort handling
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          console.log(`❌ Upload aborted for ${file.name}`);
          if (stallCheckInterval) clearInterval(stallCheckInterval);
          xhr.abort();
        });
      }

      // Enhanced progress tracking with speed calculation and ETA
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const now = Date.now();
          const uploadedBytes = event.loaded;
          const timeDiff = now - lastProgressTime;
          const bytesDiff = uploadedBytes - lastUploadedBytes;
          
          // Update basic progress
          fileProgress.uploadedBytes = uploadedBytes;
          fileProgress.status = 'uploading';
          fileProgress.isStalled = false;
          
          // Calculate upload speed and ETA
          if (timeDiff > 1000) { // Update every second
            const speed = (bytesDiff / timeDiff) * 1000; // bytes per second
            const progress = (uploadedBytes / event.total) * 100;
            const remainingBytes = event.total - uploadedBytes;
            const eta = speed > 0 ? remainingBytes / speed : 0;
            
            fileProgress.uploadSpeed = speed;
            fileProgress.eta = eta;
            
            console.log(`📈 Upload progress for ${file.name}: ${progress.toFixed(1)}% (${this.formatBytes(speed)}/s, ETA: ${this.formatTime(eta)})`);
            
            // Update network monitor with current speed
            this.networkMonitor.updateSpeed(speed);
            
            lastProgressTime = now;
            lastUploadedBytes = uploadedBytes;
          }
          
          onProgress?.(fileProgress);
        }
      });

      // Stall detection
      stallCheckInterval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastProgress = (now - lastProgressTime) / 1000;
        
        if (timeSinceLastProgress > this.config.stallThreshold && fileProgress.uploadedBytes > 0) {
          console.warn(`⚠️ Upload stalled for ${file.name} (${timeSinceLastProgress.toFixed(1)}s without progress)`);
          fileProgress.isStalled = true;
          onProgress?.(fileProgress);
        }
      }, 5000); // Check every 5 seconds

      // Handle successful upload
      xhr.addEventListener('load', () => {
        clearInterval(stallCheckInterval);
        
        console.log(`📥 Upload response for ${file.name}:`, {
          status: xhr.status,
          statusText: xhr.statusText,
          responseHeaders: xhr.getAllResponseHeaders()
        });
        
        if (xhr.status === 200) {
          console.log(`✅ Upload successful for ${file.name}`);
          resolve();
        } else {
          console.error(`❌ Upload failed for ${file.name}:`, {
            status: xhr.status,
            statusText: xhr.statusText
          });
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      // Handle various error conditions
      xhr.addEventListener('error', (event) => {
        clearInterval(stallCheckInterval);
        console.error(`❌ Network error for ${file.name}:`, event);
        reject(new Error('Upload failed: Network error'));
      });

      xhr.addEventListener('timeout', () => {
        clearInterval(stallCheckInterval);
        console.error(`⏰ Upload timeout for ${file.name} after ${timeoutMs}ms`);
        reject(new Error(`Upload timeout after ${timeoutMs / 1000}s`));
      });

      xhr.addEventListener('abort', () => {
        clearInterval(stallCheckInterval);
        console.log(`⏹️ Upload aborted for ${file.name}`);
        reject(new Error('Upload aborted'));
      });

      // Open connection and set headers
      console.log(`🔗 Opening connection to: ${uploadInfo.uploadUrl}`);
      xhr.open('POST', uploadInfo.uploadUrl);
      
      // Set required B2 headers
      console.log(`🔧 Setting request headers for ${file.name}...`);
      xhr.setRequestHeader('Authorization', uploadInfo.authorizationToken);
      xhr.setRequestHeader('Content-Type', uploadInfo.contentType);
      xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(uploadInfo.b2FileName));
      xhr.setRequestHeader('X-Bz-Content-Sha1', sha1Hash);
      
      console.log(`📤 Sending file: ${file.name} (${this.formatBytes(file.size)}) with ${timeoutMs / 1000}s timeout`);
      
      // Send file
      xhr.send(file);
    });
  }

  /**
   * Upload multiple files in batches with progress tracking
   */
  async uploadFiles(
    files: ProcessedAudioFile[],
    metadata: Record<string, string> = {},
    onBatchProgress?: (progress: UploadBatchProgress) => void,
    onFileProgress?: (progress: UploadFileProgress) => void,
    options: { concurrent?: boolean; concurrency?: number } = {}
  ): Promise<UploadBatchProgress> {
    
    const { concurrent = true, concurrency = this.config.concurrency } = options;
    
    // Initialize batch progress
    const batchId = crypto.randomUUID();
    const batchProgress: UploadBatchProgress = {
      batchId,
      totalFiles: files.length,
      completedFiles: 0,
      failedFiles: 0,
      files: files.map(file => ({
        fileName: file.file.name,
        fileSize: file.file.size,
        uploadedBytes: 0,
        status: 'pending',
      })),
    };

    // Create abort controller for this batch
    const abortController = new AbortController();
    this.abortControllers.set(batchId, abortController);

    try {
      if (concurrent) {
        console.log(`🚀 Starting concurrent B2 uploads for ${files.length} files (concurrency: ${concurrency})`);
        await this.uploadFilesConcurrently(
          files, 
          metadata, 
          batchProgress, 
          concurrency,
          onBatchProgress, 
          onFileProgress, 
          abortController
        );
      } else {
        console.log(`🚀 Starting sequential B2 uploads for ${files.length} files to avoid auth token conflicts`);
        await this.uploadFilesSequentially(
          files, 
          metadata, 
          batchProgress, 
          onBatchProgress, 
          onFileProgress, 
          abortController
        );
      }

      console.log(`🎉 Batch upload completed: ${batchProgress.completedFiles} successful, ${batchProgress.failedFiles} failed`);
      return batchProgress;

    } finally {
      // Clean up abort controller
      this.abortControllers.delete(batchId);
    }
  }

  /**
   * Upload files concurrently with controlled concurrency
   */
  private async uploadFilesConcurrently(
    files: ProcessedAudioFile[],
    metadata: Record<string, string>,
    batchProgress: UploadBatchProgress,
    concurrency: number,
    onBatchProgress?: (progress: UploadBatchProgress) => void,
    onFileProgress?: (progress: UploadFileProgress) => void,
    abortController?: AbortController
  ): Promise<void> {
    
    // Get upload URLs for all files at once (more efficient)
    console.log(`🔗 Getting upload URLs for all ${files.length} files...`);
    const urlResponse = await this.getUploadUrls(files, metadata);
    
    if (!urlResponse.success || !urlResponse.data || !urlResponse.data.urls) {
      throw new Error(urlResponse.error || 'Failed to get upload URLs');
    }

    const uploadUrls = urlResponse.data.urls;
    console.log(`✅ Got ${uploadUrls.length} upload URLs`);

    // Create upload tasks
    const uploadTasks = files.map((file, index) => ({
      file,
      index,
      uploadInfo: uploadUrls[index]
    }));

    // Execute uploads with concurrency control
    await this.executeWithConcurrency(
      uploadTasks.map(task => 
        () => this.uploadSingleFileTask(
          task,
          batchProgress,
          onBatchProgress,
          onFileProgress,
          abortController
        )
      ),
      concurrency
    );
  }

  /**
   * Upload files sequentially (original behavior)
   */
  private async uploadFilesSequentially(
    files: ProcessedAudioFile[],
    metadata: Record<string, string>,
    batchProgress: UploadBatchProgress,
    onBatchProgress?: (progress: UploadBatchProgress) => void,
    onFileProgress?: (progress: UploadFileProgress) => void,
    abortController?: AbortController
  ): Promise<void> {
    
    // Upload files sequentially to avoid auth token limit issues
    // Each file gets its own unique upload URL and token
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      
      try {
        console.log(`📤 Getting unique upload URL for file ${index + 1}/${files.length}: ${file.file.name}`);
        
        // Get a fresh upload URL for this specific file
        const urlResponse = await this.getUploadUrls([file], metadata);
        
        if (!urlResponse.success || !urlResponse.data || !urlResponse.data.urls[0]) {
          throw new Error(urlResponse.error || 'Failed to get upload URL');
        }

        const uploadInfo = urlResponse.data.urls[0];
        
        console.log(`🔗 Got fresh upload URL for ${file.file.name}:`, {
          domain: new URL(uploadInfo.uploadUrl).hostname,
          authPrefix: uploadInfo.authorizationToken.substring(0, 10) + '...'
        });

        // Upload the file with its unique URL
        await this.uploadFileToB2(
          file.file,
          uploadInfo,
          (fileProgress) => {
            // Update batch progress
            batchProgress.files[index] = fileProgress;
            onFileProgress?.(fileProgress);
            onBatchProgress?.(batchProgress);
          },
          abortController?.signal
        );

        batchProgress.completedFiles++;
        console.log(`✅ File ${index + 1}/${files.length} completed: ${file.file.name}`);
        
      } catch (error) {
        console.error(`❌ File ${index + 1}/${files.length} failed: ${file.file.name}`, error);
        batchProgress.failedFiles++;
        batchProgress.files[index].status = 'failed';
        batchProgress.files[index].error = error instanceof Error ? error.message : 'Unknown error';
      }

      onBatchProgress?.(batchProgress);
    }
  }

  /**
   * Upload a single file as part of a concurrent batch
   */
  private async uploadSingleFileTask(
    task: { file: ProcessedAudioFile; index: number; uploadInfo: UploadUrlResponse },
    batchProgress: UploadBatchProgress,
    onBatchProgress?: (progress: UploadBatchProgress) => void,
    onFileProgress?: (progress: UploadFileProgress) => void,
    abortController?: AbortController
  ): Promise<void> {
    
    const { file, index, uploadInfo } = task;
    
    try {
      console.log(`🔄 Starting concurrent upload for ${file.file.name}`);
      
      await this.uploadFileToB2(
        file.file,
        uploadInfo,
        (fileProgress) => {
          // Update batch progress
          batchProgress.files[index] = fileProgress;
          onFileProgress?.(fileProgress);
          onBatchProgress?.(batchProgress);
        },
        abortController?.signal
      );

      batchProgress.completedFiles++;
      console.log(`✅ Concurrent upload completed: ${file.file.name}`);
      
    } catch (error) {
      console.error(`❌ Concurrent upload failed: ${file.file.name}`, error);
      batchProgress.failedFiles++;
      batchProgress.files[index].status = 'failed';
      batchProgress.files[index].error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Cancel an ongoing upload batch
   */
  cancelBatch(batchId: string): void {
    const controller = this.abortControllers.get(batchId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(batchId);
    }
  }

  /**
   * Calculate SHA1 hash of a file
   */
  private async calculateSHA1(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Execute promises with concurrency limit
   */
  private async executeWithConcurrency<T>(
    promiseFactories: (() => Promise<T>)[],
    concurrency: number
  ): Promise<void> {
    const executing: Promise<T>[] = [];
    
    for (const promiseFactory of promiseFactories) {
      // Start the promise
      const promise = promiseFactory().catch(error => {
        console.error('Promise in batch failed:', error);
        // Don't re-throw, let individual files fail independently
        return null as T;
      });
      
      executing.push(promise);
      
      // If we've reached the concurrency limit, wait for one to complete
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        const stillExecuting = [];
        for (const p of executing) {
          try {
            const result = await Promise.race([p, new Promise(resolve => setTimeout(() => resolve('__timeout__'), 0))]);
            if (result === '__timeout__') {
              stillExecuting.push(p);
            }
          } catch {
            // Promise failed, it's complete
          }
        }
        executing.length = 0;
        executing.push(...stillExecuting);
      }
    }
    
    // Wait for all remaining promises
    await Promise.all(executing);
  }

  /**
   * Load persisted upload states from localStorage
   */
  private loadPersistedStates(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('b2_upload_'));
      for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data) {
          const state: PersistedUploadState = JSON.parse(data);
          // Only load states from the last 24 hours
          if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
            this.persistedStates.set(state.batchId, state);
          } else {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load persisted upload states:', error);
    }
  }

  /**
   * Record a retry attempt for tracking and analysis
   */
  private recordRetryAttempt(fileId: string, attemptNumber: number, error: unknown): void {
    const attempt: RetryAttempt = {
      attemptNumber,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : String(error),
      willRetry: attemptNumber <= this.config.retryAttempts
    };

    if (!this.retryHistory.has(fileId)) {
      this.retryHistory.set(fileId, []);
    }
    this.retryHistory.get(fileId)!.push(attempt);

    // Keep only last 10 attempts per file
    const history = this.retryHistory.get(fileId)!;
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  /**
   * Check if an error is retryable based on error type and message
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    // Network-related errors that are usually temporary
    const retryableErrors = [
      'network error',
      'timeout',
      'connection',
      'fetch',
      'ssl',
      'tls',
      'dns',
      'socket',
      'failed to fetch',
      'load failed',
      'aborted'
    ];
    
    // HTTP status codes that are retryable
    const retryableStatusCodes = [
      408, // Request Timeout
      429, // Too Many Requests  
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
      507, // Insufficient Storage
      509, // Bandwidth Limit Exceeded
    ];
    
    // Non-retryable errors (client errors that won't improve with retry)
    const nonRetryableErrors = [
      'unauthorized',
      'forbidden', 
      'not found',
      'bad request',
      'invalid',
      'malformed',
      'file too large',
      'unsupported'
    ];

    // Check for non-retryable errors first
    if (nonRetryableErrors.some(keyword => errorMessage.includes(keyword))) {
      return false;
    }
    
    // Check error message for retryable keywords
    if (retryableErrors.some(keyword => errorMessage.includes(keyword))) {
      return true;
    }
    
    // Check status codes in error message
    if (retryableStatusCodes.some(code => errorMessage.includes(code.toString()))) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if error requires fresh upload URL/token
   */
  private needsFreshUrl(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    // Errors that indicate URL/token issues
    const urlRefreshErrors = [
      'unauthorized',
      'forbidden',
      'expired',
      'invalid token',
      'authentication',
      '401',
      '403'
    ];
    
    return urlRefreshErrors.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: base delay * (2 ^ retryCount)
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    
    // Add jitter (random factor) to prevent thundering herd
    const jitter = Math.random() * 0.3 + 0.85; // 85%-115% of calculated delay
    
    // Cap at maxRetryDelay
    return Math.min(exponentialDelay * jitter, this.config.maxRetryDelay);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format bytes for human-readable display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format time duration for human-readable display
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
}

// Create a singleton instance that can be used for testing
export const b2UploadService = new B2DirectUploadService();
