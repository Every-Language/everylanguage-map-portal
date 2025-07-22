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
  projectId?: string;
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

export interface MediaRecord {
  mediaFileId: string;
  fileName: string;
  status: 'pending' | 'completed' | 'failed';
  uploadResult?: {
    downloadUrl: string;
    fileSize: number;
    version: number;
  };
  error?: string;
}

export interface BulkUploadResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    successfulUploads: number;
    failedUploads: number;
    mediaRecords: MediaRecord[];
  };
  error?: string;
  details?: string;
}

export class BulkUploadManager {
  private subscription?: RealtimeChannel;
  public progressCallback?: (progress: BulkUploadProgress[]) => void;
  private allProgressState: Map<string, BulkUploadProgress> = new Map();

  constructor(onProgress?: (progress: BulkUploadProgress[]) => void) {
    this.progressCallback = onProgress;
  }

  /**
   * Start bulk upload process
   */
  async startBulkUpload(
    files: BulkUploadFile[], 
    authToken: string
  ): Promise<BulkUploadResponse> {
    try {
      // Validate files before upload
      const validationErrors = this.validateBulkUpload(files);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Create FormData for bulk upload
      const formData = new FormData();
      
      files.forEach((item, index) => {
        // Add the file
        formData.append(`file_${index}`, item.file.file);
        
        // Add metadata as JSON string
        formData.append(`metadata_${index}`, JSON.stringify(item.metadata));
      });

      // Get Supabase URL
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

      // Set up real-time progress tracking
      this.setupProgressTracking(result.data.mediaRecords);

      // Initialize progress state
      result.data.mediaRecords.forEach(record => {
        const progress: BulkUploadProgress = {
          mediaFileId: record.mediaFileId,
          fileName: record.fileName,
          status: record.status,
          error: record.error,
          uploadResult: record.uploadResult
        };
        this.allProgressState.set(record.mediaFileId, progress);
      });

      // Notify initial progress
      this.notifyProgress();

      console.log('✅ Bulk upload started successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Bulk upload failed:', error);
      throw error instanceof Error ? error : new Error('Unknown bulk upload error');
    }
  }

  /**
   * Set up real-time progress tracking using Supabase subscriptions
   */
  private setupProgressTracking(mediaRecords: MediaRecord[]) {
    const mediaFileIds = mediaRecords
      .map(r => r.mediaFileId)
      .filter(Boolean);
    
    if (mediaFileIds.length === 0) {
      console.warn('No media file IDs to track');
      return;
    }

    console.log('🔔 Setting up progress tracking for IDs:', mediaFileIds);

    // Subscribe to database changes for these media files
    this.subscription = supabase
      .channel('bulk_upload_progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_files',
          filter: `id=in.(${mediaFileIds.join(',')})`
        },
        (payload: { new: Record<string, unknown> }) => {
          console.log('📡 Progress update received:', payload);
          this.handleProgressUpdate(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('🔔 Subscription status:', status);
      });
  }

  /**
   * Handle progress updates from Supabase
   */
  private handleProgressUpdate(updatedRecord: Record<string, unknown>) {
    const id = updatedRecord.id as string;
    const uploadStatus = updatedRecord.upload_status as 'pending' | 'uploading' | 'completed' | 'failed';
    const remotePath = updatedRecord.remote_path as string | undefined;
    const fileName = updatedRecord.file_name as string | undefined;
    const fileSize = updatedRecord.file_size as number | undefined;
    const version = updatedRecord.version as number | undefined;
    const errorMessage = updatedRecord.error_message as string | undefined;

    const progress: BulkUploadProgress = {
      mediaFileId: id,
      fileName: remotePath || fileName || 'Unknown',
      status: uploadStatus,
      uploadResult: uploadStatus === 'completed' && remotePath && fileSize && version ? {
        downloadUrl: remotePath,
        fileSize: fileSize,
        version: version
      } : undefined,
      error: uploadStatus === 'failed' ? errorMessage : undefined
    };

    // Update our progress state
    this.allProgressState.set(id, progress);
    
    // Notify listeners
    this.notifyProgress();

    // Check if all uploads are complete
    const allComplete = Array.from(this.allProgressState.values()).every(
      p => p.status === 'completed' || p.status === 'failed'
    );

    if (allComplete) {
      console.log('🎉 All uploads completed, cleaning up subscription');
      this.cleanup();
    }
  }

  /**
   * Notify progress callback with current state
   */
  private notifyProgress() {
    if (this.progressCallback) {
      const progressArray = Array.from(this.allProgressState.values());
      this.progressCallback(progressArray);
    }
  }

  /**
   * Validate bulk upload files
   */
  private validateBulkUpload(files: BulkUploadFile[]): string[] {
    const errors: string[] = [];

    if (!files || files.length === 0) {
      errors.push('No files provided for upload');
      return errors;
    }

    if (files.length > 80) {
      errors.push('Maximum 80 files allowed per bulk upload');
    }

    files.forEach((item, index) => {
      const fileErrors = this.validateSingleFile(item, index);
      errors.push(...fileErrors);
    });

    return errors;
  }

  /**
   * Validate a single file for bulk upload
   */
  private validateSingleFile(item: BulkUploadFile, index: number): string[] {
    const errors: string[] = [];
    const prefix = `File ${index + 1}`;

    if (!item.file || !item.file.file) {
      errors.push(`${prefix}: Missing file object`);
      return errors;
    }

    if (!item.metadata) {
      errors.push(`${prefix}: Missing metadata`);
      return errors;
    }

    const { metadata } = item;

    if (!metadata.languageEntityId) {
      errors.push(`${prefix}: Language Entity ID is required`);
    }

    if (!metadata.fileName) {
      errors.push(`${prefix}: File name is required`);
    }

    if (!metadata.chapterId) {
      errors.push(`${prefix}: Chapter ID is required`);
    }

    if (!metadata.startVerseId) {
      errors.push(`${prefix}: Start Verse ID is required`);
    }

    if (!metadata.endVerseId) {
      errors.push(`${prefix}: End Verse ID is required`);
    }

    if (!metadata.durationSeconds || metadata.durationSeconds <= 0) {
      errors.push(`${prefix}: Valid duration is required`);
    }

    // File size validation (500MB max)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (item.file.file.size > maxSize) {
      errors.push(`${prefix}: File size exceeds 500MB limit`);
    }

    return errors;
  }

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
    if (this.subscription) {
      console.log('🧹 Cleaning up bulk upload subscription');
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }
}

// Helper function to create bulk upload file objects
export function createBulkUploadFiles(
  processedFiles: ProcessedAudioFile[],
  projectId: string,
  languageEntityId: string,
  audioVersionId: string
): BulkUploadFile[] {
  return processedFiles
    .filter(file => file.isValid && file.selectedChapterId && file.selectedStartVerseId && file.selectedEndVerseId)
    .map(file => ({
      file,
      metadata: {
        languageEntityId,
        audioVersionId,
        projectId,
        fileName: file.name,
        durationSeconds: file.duration,
        startVerseId: file.selectedStartVerseId!,
        endVerseId: file.selectedEndVerseId!,
        chapterId: file.selectedChapterId!,
        // Optional fields
        verseTimings: undefined, // Not extracting verse timings anymore per instructions
        tagIds: undefined, // Can be added later if needed
      }
    }));
} 