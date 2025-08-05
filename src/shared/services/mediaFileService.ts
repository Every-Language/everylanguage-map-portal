import { supabase } from './supabase';
import type { ProcessedAudioFile } from './audioFileProcessor';
import type { UploadFileProgress } from './b2DirectUploadService';

export interface MediaFileInsertData {
  language_entity_id: string;
  audio_version_id: string;
  media_type: 'audio';
  is_bible_audio: boolean;
  chapter_id: string;
  start_verse_id: string;
  end_verse_id: string;
  remote_path: string;
  file_size: number;
  duration_seconds: number;
  upload_status: 'completed';
  publish_status: 'pending';
  check_status: 'pending';
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: null;
  created_by: string;
}

export interface MediaFileCreateRequest {
  processedFile: ProcessedAudioFile;
  uploadResult: UploadFileProgress;
  projectData: {
    languageEntityId: string;
    languageEntityName: string;
    audioVersionId: string;
  };
  userId: string;
}

export class MediaFileService {
  /**
   * Insert a single media file record into the database
   */
  async createMediaFile(request: MediaFileCreateRequest): Promise<string> {
    const { processedFile, uploadResult, projectData, userId } = request;
    
    if (!uploadResult.remotePath) {
      throw new Error('Upload result must include remote path');
    }

    // Calculate version number by checking for existing files
    const version = await this.calculateVersionNumber(
      projectData.audioVersionId,
      processedFile.selectedChapterId!,
      processedFile.selectedStartVerseId!,
      processedFile.selectedEndVerseId!
    );

    // Prepare insert data
    const insertData: MediaFileInsertData = {
      language_entity_id: projectData.languageEntityId,
      audio_version_id: projectData.audioVersionId,
      media_type: 'audio',
      is_bible_audio: true,
      chapter_id: processedFile.selectedChapterId!,
      start_verse_id: processedFile.selectedStartVerseId!,
      end_verse_id: processedFile.selectedEndVerseId!,
      remote_path: uploadResult.remotePath,
      file_size: uploadResult.fileSize,
      duration_seconds: Math.round(processedFile.duration),
      upload_status: 'completed',
      publish_status: 'pending',
      check_status: 'pending',
      version: version,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      created_by: userId,
    };

    // Insert the media file record
    const { data, error } = await supabase
      .from('media_files')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting media file:', error);
      throw new Error(`Failed to create media file record: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Create multiple media file records in a batch
   */
  async createMediaFilesBatch(requests: MediaFileCreateRequest[]): Promise<string[]> {
    const mediaFileIds: string[] = [];
    const errors: Error[] = [];

    // Process each file sequentially to handle version calculation properly
    for (const request of requests) {
      try {
        const id = await this.createMediaFile(request);
        mediaFileIds.push(id);
      } catch (error) {
        console.error(`Failed to create media file for ${request.processedFile.file.name}:`, error);
        errors.push(error instanceof Error ? error : new Error('Unknown error'));
      }
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} out of ${requests.length} media files failed to create`);
      // Return successful IDs, but could also throw if you want all-or-nothing behavior
    }

    return mediaFileIds;
  }

  /**
   * Calculate the version number for a new media file
   * Checks for existing files with same audio version, chapter, and verse range
   */
  private async calculateVersionNumber(
    audioVersionId: string,
    chapterId: string,
    startVerseId: string,
    endVerseId: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from('media_files')
      .select('version')
      .eq('audio_version_id', audioVersionId)
      .eq('chapter_id', chapterId)
      .eq('start_verse_id', startVerseId)
      .eq('end_verse_id', endVerseId)
      .is('deleted_at', null)
      .order('version', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error calculating version number:', error);
      // Default to version 1 if we can't query
      return 1;
    }

    // If no existing files, start with version 1
    if (!data || data.length === 0) {
      return 1;
    }

    // Increment the highest existing version
    return (data[0].version || 0) + 1;
  }

  /**
   * Get OSIS book abbreviation from chapter ID
   */
  async getBookOsisFromChapter(chapterId: string): Promise<string> {
    const { data, error } = await supabase
      .from('chapters')
      .select(`
        book:books!book_id(
          id
        )
      `)
      .eq('id', chapterId)
      .single();

    if (error || !data?.book?.id) {
      throw new Error(`Failed to get book OSIS abbreviation for chapter ${chapterId}`);
    }

    return data.book.id;
  }

  /**
   * Get chapter number from chapter ID
   */
  async getChapterNumber(chapterId: string): Promise<number> {
    const { data, error } = await supabase
      .from('chapters')
      .select('chapter_number')
      .eq('id', chapterId)
      .single();

    if (error || !data?.chapter_number) {
      throw new Error(`Failed to get chapter number for chapter ${chapterId}`);
    }

    return data.chapter_number;
  }

  /**
   * Get verse numbers from verse IDs
   */
  async getVerseNumbers(verseIds: string[]): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('verses')
      .select('id, verse_number')
      .in('id', verseIds);

    if (error) {
      throw new Error(`Failed to get verse numbers: ${error.message}`);
    }

    const verseMap: Record<string, number> = {};
    data?.forEach(verse => {
      verseMap[verse.id] = verse.verse_number;
    });

    return verseMap;
  }
}

// Export singleton instance
export const mediaFileService = new MediaFileService(); 