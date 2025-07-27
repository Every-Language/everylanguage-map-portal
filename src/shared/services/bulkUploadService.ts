import type { ProcessedAudioFile } from './audioFileProcessor';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

export interface MediaRecord {
  mediaFileId: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
    version: number;
  error?: string;
}

export interface BulkUploadResponse {
  success: boolean;
  data?: {
    totalFiles: number;
    batchId: string;
    mediaRecords: MediaRecord[];
  };
  error?: string;
  details?: string;
}

// New interfaces for progress tracking
export interface UploadProgressData {
  totalFiles: number;
  pendingCount: number;
  uploadingCount: number;
  completedCount: number;
  failedCount: number;
  progress: {
    percentage: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  };
  files: Array<{
    mediaFileId: string;
    fileName: string;
    status: string;
    downloadUrl?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface UploadProgressResponse {
  success: boolean;
  data?: UploadProgressData;
  error?: string;
}

export class BulkUploadManager {
  private subscription?: RealtimeChannel;
  public progressCallback?: (progress: BulkUploadProgress[]) => void;
  private allProgressState: Map<string, BulkUploadProgress> = new Map();
  private mediaFileIds: string[] = [];
  private progressInterval?: NodeJS.Timeout;
  private maxTrackingTime = 10 * 60 * 1000; // 10 minutes max
  private trackingStartTime?: number;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;

  constructor(onProgress?: (progress: BulkUploadProgress[]) => void) {
    this.progressCallback = onProgress;
  }

  /**
   * Start bulk upload process using new backend endpoints
   */
  async startBulkUpload(
    files: BulkUploadFile[], 
    authToken: string
  ): Promise<BulkUploadResponse> {
    try {
      console.log('🚀 Starting bulk upload with files:', files.length);
      
      // Validate files before upload
      const validationErrors = this.validateBulkUpload(files);
      if (validationErrors.length > 0) {
        console.error('❌ Validation errors:', validationErrors);
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      console.log('✅ All files passed validation');

      // Create FormData for bulk upload
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

      // Call the new bulk upload edge function
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

      console.log('📋 New edge function response:', result);

      // Store media file IDs for progress tracking
      this.mediaFileIds = result.data.mediaRecords
        .map(record => record.mediaFileId)
        .filter(Boolean);

      // Initialize progress state immediately with the response data
      result.data.mediaRecords.forEach(record => {
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

      // Start real-time progress tracking using the new progress endpoint
      this.startProgressTracking(authToken);

      console.log('✅ Bulk upload started successfully with new progress tracking');
      return result;

    } catch (error) {
      console.error('❌ Bulk upload failed:', error);
      throw error instanceof Error ? error : new Error('Unknown bulk upload error');
    }
  }

  /**
   * Start progress tracking using the new get-upload-progress endpoint
   */
  private startProgressTracking(authToken: string) {
    if (this.mediaFileIds.length === 0) {
      console.warn('No media file IDs to track');
      return;
    }

    console.log('🔔 Starting progress tracking for IDs:', this.mediaFileIds);
    
    // Record tracking start time
    this.trackingStartTime = Date.now();
    this.consecutiveErrors = 0;

    // Poll the new progress endpoint every 2 seconds
    this.progressInterval = setInterval(async () => {
      try {
        // Check if we've exceeded maximum tracking time
        if (this.trackingStartTime && Date.now() - this.trackingStartTime > this.maxTrackingTime) {
          console.warn('⏰ Maximum tracking time exceeded, stopping progress tracking');
          this.stopProgressTracking();
          return;
        }

        await this.checkUploadProgress(authToken);
      } catch (error) {
        console.error('❌ Progress check error:', error);
        this.consecutiveErrors++;
        
        // Stop tracking if we have too many consecutive errors
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          console.warn(`❌ Too many consecutive errors (${this.consecutiveErrors}), stopping progress tracking`);
          this.stopProgressTracking();
          return;
        }
      }
    }, 2000);

    // Initial check
    this.checkUploadProgress(authToken);
  }

  /**
   * Check upload progress using the new endpoint
   */
  private async checkUploadProgress(authToken: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('Supabase URL not configured for progress tracking');
      return;
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/get-upload-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          mediaFileIds: this.mediaFileIds 
        }),
      });

      if (!response.ok) {
        throw new Error(`Progress check failed: ${response.statusText}`);
      }

      const progressResponse: UploadProgressResponse = await response.json();

      if (progressResponse.success && progressResponse.data) {
        // Reset error count on successful response
        this.consecutiveErrors = 0;
        this.handleProgressResponse(progressResponse.data);
      } else {
        console.error('Progress check failed:', progressResponse.error);
        throw new Error('Progress response indicated failure');
      }
    } catch (error) {
      console.error('❌ Failed to check upload progress:', error);
      throw error; // Re-throw to be handled by the interval error handler
    }
  }

  /**
   * Handle progress response from the new endpoint
   */
  private handleProgressResponse(data: UploadProgressData) {
    let hasChanges = false;

    // Update progress state with new data
    data.files.forEach(file => {
      const currentProgress = this.allProgressState.get(file.mediaFileId);
      
      if (!currentProgress || currentProgress.status !== file.status) {
        console.log(`📊 Progress update for ${file.fileName}: ${currentProgress?.status} → ${file.status}`);
        
        const updatedProgress: BulkUploadProgress = {
          mediaFileId: file.mediaFileId,
          fileName: file.fileName,
          status: file.status as 'pending' | 'uploading' | 'completed' | 'failed',
          error: file.error,
          uploadResult: file.downloadUrl ? {
            downloadUrl: file.downloadUrl,
            fileSize: 0, // Not provided by new endpoint
            version: 1   // Default version
          } : undefined
        };
        
        this.allProgressState.set(file.mediaFileId, updatedProgress);
        hasChanges = true;
      }
    });

    // Notify progress if there are changes
    if (hasChanges) {
      console.log('📋 Updated progress state:', Array.from(this.allProgressState.values()));
      this.notifyProgress();
    }

    // Stop tracking if all uploads are complete (check both backend status AND individual files)
    const allFilesComplete = this.allProgressState.size > 0 && 
      Array.from(this.allProgressState.values()).every(
        p => p.status === 'completed' || p.status === 'failed'
      );
    
    const backendReportsComplete = data.progress.status === 'completed' || data.progress.status === 'failed';
    
    if (allFilesComplete || backendReportsComplete) {
      console.log('🎉 All uploads completed (individual files complete:', allFilesComplete, ', backend reports:', backendReportsComplete, '), stopping progress tracking');
      this.stopProgressTracking();
    }
  }

  /**
   * Stop progress tracking
   */
  private stopProgressTracking() {
    console.log('🛑 Stopping progress tracking');
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
    }
    
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
    
    // Reset tracking state
    this.trackingStartTime = undefined;
    this.consecutiveErrors = 0;
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
    console.log('🧹 Cleaning up bulk upload manager');
    
    this.stopProgressTracking();
    
    // Clear all state
    this.allProgressState.clear();
    this.mediaFileIds = [];
    this.progressCallback = undefined;
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