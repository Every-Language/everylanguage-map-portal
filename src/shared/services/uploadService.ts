import type { ProcessedAudioFile } from './audioFileProcessor';
import { supabase } from './supabase';

export interface UploadAudioFileParams {
  file: ProcessedAudioFile;
  projectId: string;
  languageEntityId: string;
  chapterId: string;
  startVerseId: string;
  endVerseId: string;
  durationSeconds: number;
  verseTimings?: Array<{
    verseId: string;
    startTimeSeconds: number;
    durationSeconds: number;
  }>;
  tagIds?: string[];
  onProgress?: (progress: number) => void;
}

export interface UploadResponse {
  success: boolean;
  data?: {
    mediaFileId: string;
    downloadUrl: string;
    fileSize: number;
    version: number;
    duration: number;
    chapterId: string;
    startVerseId: string;
    endVerseId: string;
    verseRecordsCreated: number;
    tagRecordsCreated: number;
  };
  error?: string;
  details?: string;
}

export class UploadService {
  async uploadAudioFile(params: UploadAudioFileParams): Promise<void> {
    const {
      file,
      projectId,
      languageEntityId,
      chapterId,
      startVerseId,
      endVerseId,
      durationSeconds,
      verseTimings,
      tagIds,
      onProgress
    } = params;

    try {
      // Validate that file is actually a File object with a name
      if (!file || typeof file.name !== 'string') {
        console.error('Invalid file object:', file);
        throw new Error('Invalid file object - missing name property');
      }

      // Validate required parameters
      const validationErrors = this.validateUploadParams(params);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Update progress to 10% for starting upload
      onProgress?.(10);

      // Create FormData with individual fields (matching edge function expectations)
      const formData = new FormData();
      
      // Debug: Log file details before sending
      console.log('🔍 FRONTEND DEBUG: File details being sent:', {
        fileName: file.name,
        fileSize: file.file.size,
        fileType: file.file.type,
        lastModified: file.file.lastModified,
        isFileObject: file.file instanceof File
      });
      
      formData.append('file', file.file); // Use the actual File object from the processed file
      
      // Add individual fields that the edge function expects
      formData.append('language_entity_id', languageEntityId);
      formData.append('chapter_id', chapterId);
      formData.append('start_verse_id', startVerseId);
      formData.append('end_verse_id', endVerseId);
      formData.append('duration_seconds', durationSeconds.toString());
      
      // Optional fields
      if (projectId) {
        formData.append('project_id', projectId);
      }
      
      // JSON arrays as strings (if provided)
      if (verseTimings && verseTimings.length > 0) {
        formData.append('verse_timings', JSON.stringify(verseTimings));
      }
      
      if (tagIds && tagIds.length > 0) {
        formData.append('tag_ids', JSON.stringify(tagIds));
      }

      // Update progress to 20% before making request
      onProgress?.(20);

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Call the edge function directly (FormData works better with fetch)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }
      const response = await fetch(`${supabaseUrl}/functions/v1/upload-bible-chapter-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      // Update progress to 90% after network request
      onProgress?.(90);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          // If JSON parsing fails, use the raw text
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        console.error('❌ Edge function error response:', errorText);
        console.error('❌ Full response details:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url
        });
        console.error('❌ FormData sent:', {
          languageEntityId,
          chapterId,
          startVerseId,
          endVerseId,
          durationSeconds,
          projectId,
          fileName: file.name,
          fileSize: file.file.size,
          fileType: file.file.type,
          verseTimingsCount: verseTimings?.length || 0,
          tagIdsCount: tagIds?.length || 0
        });
        throw new Error(errorMessage);
      }

      const result: UploadResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.details || 'Upload failed');
      }

      // Update progress to 100% on success
      onProgress?.(100);

      console.log('✅ Upload successful:', result);

    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error instanceof Error ? error : new Error('Unknown upload error');
    }
  }

  // Helper method to validate upload parameters
  validateUploadParams(params: UploadAudioFileParams): string[] {
    const errors: string[] = [];

    if (!params.file) {
      errors.push('File is required');
    }

    if (!params.projectId) {
      errors.push('Project ID is required');
    }

    if (!params.languageEntityId) {
      errors.push('Language Entity ID is required');
    }

    if (!params.chapterId) {
      errors.push('Chapter ID is required');
    }

    if (!params.startVerseId) {
      errors.push('Start Verse ID is required');
    }

    if (!params.endVerseId) {
      errors.push('End Verse ID is required');
    }

    if (!params.durationSeconds || params.durationSeconds <= 0) {
      errors.push('Valid duration is required');
    }

    return errors;
  }

  // Helper method to check if file is valid for upload
  isFileValidForUpload(file: ProcessedAudioFile): boolean {
    return file && 
           file.file &&
           typeof file.name === 'string' &&
           file.isValid && 
           !!file.selectedChapterId && 
           !!file.selectedStartVerseId && 
           !!file.selectedEndVerseId &&
           file.uploadStatus !== 'uploading' &&
           file.uploadStatus !== 'success';
  }
} 