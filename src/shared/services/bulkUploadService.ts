import type { ProcessedAudioFile } from './audioFileProcessor';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface BulkUploadFile {
  file: ProcessedAudioFile;
  metadata: BulkUploadMetadata;
}

export interface BulkUploadMetadata {
  languageEntityId: string;
  audioVersionId: string;
  fileName: string;
  durationSeconds: number;
  startVerseId: string;
  endVerseId: string;
  chapterId: string;
  verseTimings?: Array<{
    verseId: string;
    startTimeSeconds: number;
    durationSeconds: number;
  }>;
  tagIds?: string[];
}

export interface BulkUploadProgress {
  mediaFileId: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  uploadResult?: {
    downloadUrl: string;
    fileSize: number;
    version: number;
  };
}

export interface BulkUploadResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    batchId: string;
    mediaRecords: Array<{
      mediaFileId: string;
      fileName: string;
      status: 'pending' | 'failed';
      version: number;
      error?: string;
    }>;
  };
  error?: string;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffMultiplier: 2
};

export class BulkUploadManager {
  private subscription?: RealtimeChannel;
  private mediaFileIds: string[] = [];
  private allProgressState = new Map<string, BulkUploadProgress>();
  private onProgress?: (progress: BulkUploadProgress[]) => void;
  private projectId?: string;
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;
  
  // Progress callback for external tracking
  progressCallback?: (progress: BulkUploadProgress[]) => void;

  constructor(onProgress?: (progress: BulkUploadProgress[]) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Start bulk upload process with retry logic and realtime tracking
   */
  async startBulkUpload(
    files: BulkUploadFile[], 
    authToken: string,
    projectId: string
  ): Promise<BulkUploadResponse> {
    
    console.log('📋 Starting new bulk upload with', files.length, 'files');
    
    // Store project ID for progress tracking
    this.projectId = projectId;

    try {
      // Upload files with retry logic
      const result = await this.uploadWithRetry(files, authToken);

      // Store media file IDs for progress tracking
      this.mediaFileIds = result.data?.mediaRecords
        .map(record => record.mediaFileId)
        .filter(Boolean) || [];

      // Initialize progress state immediately with the response data
      result.data?.mediaRecords.forEach(record => {
        const progress: BulkUploadProgress = {
          mediaFileId: record.mediaFileId,
          fileName: record.fileName,
          status: record.status,
          error: record.error
        };
        this.allProgressState.set(record.mediaFileId, progress);
      });

      // Notify initial progress immediately
      console.log('📊 Initial progress state:', Array.from(this.allProgressState.values()));
      this.notifyProgress();

      // Start realtime progress tracking
      this.startRealtimeTracking();

      console.log('✅ Bulk upload started successfully with realtime tracking');
      return result;

    } catch (error) {
      console.error('❌ Bulk upload failed after retries:', error);
      throw error instanceof Error ? error : new Error('Unknown bulk upload error');
    }
  }

  /**
   * Upload files with retry logic and exponential backoff
   */
  private async uploadWithRetry(
    files: BulkUploadFile[], 
    authToken: string, 
    retryCount = 0
  ): Promise<BulkUploadResponse> {
    try {
      return await this.performUpload(files, authToken);
    } catch (error) {
      if (retryCount < this.retryConfig.maxRetries && this.isRetryableError(error)) {
        const delay = Math.min(
          this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount),
          this.retryConfig.maxDelay
        );
        
        console.log(`⏳ Retrying upload in ${delay}ms (attempt ${retryCount + 1}/${this.retryConfig.maxRetries})`);
        console.log(`❌ Previous error:`, error);
        
        await this.delay(delay);
        return this.uploadWithRetry(files, authToken, retryCount + 1);
      }
      
      // If max retries exceeded or non-retryable error, throw the error
      throw error;
    }
  }

  /**
   * Perform the actual upload API call
   */
  private async performUpload(files: BulkUploadFile[], authToken: string): Promise<BulkUploadResponse> {
    // Create FormData for multipart upload
    const formData = new FormData();
    
    files.forEach((item, index) => {
      console.log(`📁 Adding file ${index}:`, item.file.name, 'with metadata:', item.metadata);
      
      // Add the file
      formData.append(`file_${index}`, item.file.file);
      
      // Convert metadata to the new backend format
      const backendMetadata = {
        fileName: item.metadata.fileName,
        languageEntityId: item.metadata.languageEntityId,
        chapterId: item.metadata.chapterId,
        startVerseId: item.metadata.startVerseId,
        endVerseId: item.metadata.endVerseId,
        durationSeconds: item.metadata.durationSeconds,
        audioVersionId: item.metadata.audioVersionId,
        verseTimings: item.metadata.verseTimings?.map(timing => ({
          verseId: timing.verseId,
          startTime: timing.startTimeSeconds,
          endTime: timing.startTimeSeconds + timing.durationSeconds
        })),
        tagIds: item.metadata.tagIds
      };
      
      // Add metadata as JSON string
      const metadataJson = JSON.stringify(backendMetadata);
      formData.append(`metadata_${index}`, metadataJson);
      
      console.log(`📋 Backend metadata JSON for ${item.file.name}:`, metadataJson);
    });

    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    // Call the bulk upload edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/upload-bible-chapter-audio-bulk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.details || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      console.error('❌ Bulk upload edge function error:', errorText);
      throw new Error(errorMessage);
    }

    const result: BulkUploadResponse = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Bulk upload failed');
    }

    console.log('📋 Edge function response:', result);
    return result;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
    const errorString = String(error).toLowerCase();
    
    // Network errors (fetch failures, timeouts)
    if (errorMessage.includes('fetch') || 
        errorMessage.includes('network') || 
        errorMessage.includes('timeout') ||
        errorString.includes('networkerror')) {
      return true;
    }
    
    // HTTP 5xx server errors
    if (errorMessage.includes('http 5') || 
        errorMessage.includes('internal server error') ||
        errorMessage.includes('service unavailable') ||
        errorMessage.includes('gateway timeout')) {
      return true;
    }
    
    // Rate limiting
    if (errorMessage.includes('429') || 
        errorMessage.includes('too many requests') ||
        errorMessage.includes('rate limit')) {
      return true;
    }
    
    // Temporary Supabase issues
    if (errorMessage.includes('connection') ||
        errorMessage.includes('unavailable')) {
      return true;
    }
    
    return false;
  }

  /**
   * Utility delay function for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start realtime progress tracking using Supabase realtime
   */
  private startRealtimeTracking() {
    if (this.mediaFileIds.length === 0) {
      console.warn('No media file IDs to track');
      return;
    }

    console.log('🔔 Starting realtime progress tracking for IDs:', this.mediaFileIds);
    
    // Create a unique channel name
    const channelName = `upload_progress_${this.projectId}_${Date.now()}`;
    
    this.subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_files',
          filter: `id=in.(${this.mediaFileIds.join(',')})`
        },
        (payload) => {
          console.log('📡 Realtime upload progress update:', payload);
          this.handleRealtimeProgressUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status);
      });
  }

  /**
   * Handle realtime progress updates from Supabase
   */
  private handleRealtimeProgressUpdate(payload: { new: Record<string, unknown> }) {
    const { new: updatedRecord } = payload;
    
    const recordId = updatedRecord.id as string;
    if (!updatedRecord || !recordId || !this.mediaFileIds.includes(recordId)) {
      return;
    }

    const remotePath = updatedRecord.remote_path as string | null;
    const fileName = remotePath ? remotePath.split('/').pop() || 'Unknown' : 'Unknown';
    const uploadStatus = updatedRecord.upload_status as string;

    console.log(`📊 Progress update for ${fileName}: ${uploadStatus}`);
    
    const progress: BulkUploadProgress = {
      mediaFileId: recordId,
      fileName,
      status: uploadStatus as 'pending' | 'uploading' | 'completed' | 'failed',
      error: updatedRecord.error_message as string | undefined,
      uploadResult: uploadStatus === 'completed' ? {
        downloadUrl: (updatedRecord.download_url as string) || '',
        fileSize: (updatedRecord.file_size as number) || 0,
        version: (updatedRecord.version as number) || 1
      } : undefined
    };
    
    this.allProgressState.set(recordId, progress);
    this.notifyProgress();
    
    // Check if all uploads are complete
    const allComplete = Array.from(this.allProgressState.values()).every(
      p => p.status === 'completed' || p.status === 'failed'
    );
    
    if (allComplete) {
      console.log('🎉 All uploads completed via realtime, stopping tracking');
      this.stopProgressTracking();
    }
  }

  /**
   * Resume tracking existing uploads
   */
  static async resumeExistingUploads(
    projectId: string,
    onProgress?: (progress: BulkUploadProgress[]) => void
  ): Promise<BulkUploadManager | null> {
    console.log('🔄 Checking for existing uploads to resume...');
    
    try {
      // Check for uploads still in progress (last 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { data: inProgressUploads, error } = await supabase
        .from('media_files')
        .select('id, remote_path, upload_status, created_at')
        .in('upload_status', ['pending', 'uploading'])
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error checking for existing uploads:', error);
        return null;
      }

      if (!inProgressUploads || inProgressUploads.length === 0) {
        console.log('✅ No existing uploads to resume');
        return null;
      }

      console.log('📋 Found', inProgressUploads.length, 'uploads to resume:', inProgressUploads);

      // Create a new manager for resumed uploads
      const manager = new BulkUploadManager(onProgress);
      manager.projectId = projectId;
      manager.mediaFileIds = inProgressUploads.map(upload => upload.id);

      // Initialize progress state
      inProgressUploads.forEach(upload => {
        const fileName = upload.remote_path ? upload.remote_path.split('/').pop() || 'Unknown' : 'Unknown';
        const progress: BulkUploadProgress = {
          mediaFileId: upload.id,
          fileName,
          status: upload.upload_status as 'pending' | 'uploading',
        };
        manager.allProgressState.set(upload.id, progress);
      });

      // Notify initial progress
      manager.notifyProgress();

      // Start realtime tracking for resumed uploads
      manager.startRealtimeTracking();

      console.log('✅ Resumed tracking for', inProgressUploads.length, 'uploads');
      return manager;

    } catch (error) {
      console.error('❌ Error resuming uploads:', error);
      return null;
    }
  }

  /**
   * Stop progress tracking and cleanup
   */
  private stopProgressTracking() {
    console.log('🛑 Stopping progress tracking');
    
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = undefined;
    }
  }

  /**
   * Notify progress callback with current state
   */
  private notifyProgress() {
    const progressArray = Array.from(this.allProgressState.values());
    
    if (this.onProgress) {
      this.onProgress(progressArray);
    }
    
    if (this.progressCallback) {
      this.progressCallback(progressArray);
    }
  }

  // Removed unused validateBulkUpload method

  // Removed unused validateSingleFile method

  /**
   * Get current upload progress
   */
  getProgress(): BulkUploadProgress[] {
    return Array.from(this.allProgressState.values());
  }

  /**
   * Check if all uploads are complete
   */
  isComplete(): boolean {
    if (this.allProgressState.size === 0) return false;
    
    return Array.from(this.allProgressState.values()).every(
      p => p.status === 'completed' || p.status === 'failed'
    );
  }

  /**
   * Get upload summary
   */
  getSummary() {
    const progress = this.getProgress();
    return {
      total: progress.length,
      completed: progress.filter(p => p.status === 'completed').length,
      failed: progress.filter(p => p.status === 'failed').length,
      pending: progress.filter(p => p.status === 'pending').length,
      uploading: progress.filter(p => p.status === 'uploading').length,
    };
  }

  /**
   * Clean up subscriptions and resources
   */
  cleanup() {
    console.log('🧹 Cleaning up bulk upload manager');
    
    this.stopProgressTracking();
    
    // Clear all state
    this.allProgressState.clear();
    this.mediaFileIds = [];
    this.onProgress = undefined;
  }
}

// Helper function to create bulk upload file objects
export function createBulkUploadFiles(
  processedFiles: ProcessedAudioFile[],
  languageEntityId: string,
  audioVersionId: string
): BulkUploadFile[] {
  console.log('🔍 Creating bulk upload files with:', { 
    languageEntityId, 
    audioVersionId, 
    filesCount: processedFiles.length 
  });

  // Validate input parameters
  if (!languageEntityId) {
    throw new Error('languageEntityId is required');
  }
  if (!audioVersionId) {
    throw new Error('audioVersionId is required');
  }

  const validFiles = processedFiles.filter(file => {
    const isValid = file.isValid && 
      file.selectedChapterId && 
      file.selectedStartVerseId && 
      file.selectedEndVerseId;
    
    if (!isValid) {
      console.warn('❌ Filtering out invalid file:', {
        fileName: file.name,
        isValid: file.isValid,
        hasChapter: !!file.selectedChapterId,
        hasStartVerse: !!file.selectedStartVerseId,
        hasEndVerse: !!file.selectedEndVerseId
      });
    }
    
    return isValid;
  });

  console.log(`✅ ${validFiles.length}/${processedFiles.length} files are valid for upload`);

  return validFiles.map(file => {
    const metadata = {
      languageEntityId,
      audioVersionId,
      fileName: file.name,
      durationSeconds: file.duration,
      startVerseId: file.selectedStartVerseId!,
      endVerseId: file.selectedEndVerseId!,
      chapterId: file.selectedChapterId!,
      // Optional fields
      verseTimings: undefined, // Not extracting verse timings anymore per instructions
      tagIds: undefined, // Can be added later if needed
    };

    console.log('📋 Created metadata for file:', file.name, metadata);
    
    return {
      file,
      metadata
    };
  });
} 