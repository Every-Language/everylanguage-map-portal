import { supabase } from './supabase';
import type { ProcessedAudioFile } from './audioFileProcessor';
import type { UploadFileProgress } from '../types/upload';

export interface MediaFileInsertData {
  language_entity_id: string;
  audio_version_id: string;
  media_type: 'audio';
  is_bible_audio: boolean;
  chapter_id: string;
  start_verse_id: string;
  end_verse_id: string;
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
   * Create a pending media file record (for by-id upload flow)
   */
  async createPendingMediaFile(params: {
    processedFile: ProcessedAudioFile;
    projectData: { languageEntityId: string; audioVersionId: string };
    userId: string;
  }): Promise<string> {
    const { processedFile, projectData, userId } = params;

    // Calculate version number similar to createMediaFile
    const version = await this.calculateVersionNumber(
      projectData.audioVersionId,
      processedFile.selectedChapterId!,
      processedFile.selectedStartVerseId!,
      processedFile.selectedEndVerseId!
    );

    const { data, error } = await supabase
      .from('media_files')
      .insert({
        language_entity_id: projectData.languageEntityId,
        audio_version_id: projectData.audioVersionId,
        media_type: 'audio',
        is_bible_audio: true,
        chapter_id: processedFile.selectedChapterId!,
        start_verse_id: processedFile.selectedStartVerseId!,
        end_verse_id: processedFile.selectedEndVerseId!,
        duration_seconds: Math.round(processedFile.duration),
        upload_status: 'pending',
        publish_status: 'pending',
        check_status: 'pending',
        version,
        original_filename: processedFile.file.name, // Store original filename
        file_type: processedFile.file.name.split('.').pop()?.toLowerCase() || null, // Extract file extension
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating pending media file:', error);
      throw new Error(`Failed to create pending media file record: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Create multiple pending media file records in a single batch operation
   * This is much more efficient than creating them individually
   */
  async createPendingMediaFilesBatch(params: {
    processedFiles: ProcessedAudioFile[];
    projectData: { languageEntityId: string; audioVersionId: string };
    userId: string;
  }): Promise<string[]> {
    const { processedFiles, projectData, userId } = params;

    if (processedFiles.length === 0) {
      return [];
    }

    // Step 1: Batch calculate version numbers for all unique chapter/verse combinations
    const versionMap = await this.calculateVersionNumbersBatch(
      projectData.audioVersionId,
      processedFiles
    );

    // Step 2: Prepare all insert records
    const now = new Date().toISOString();
    const insertRecords = processedFiles.map(file => ({
      language_entity_id: projectData.languageEntityId,
      audio_version_id: projectData.audioVersionId,
      media_type: 'audio' as const,
      is_bible_audio: true,
      chapter_id: file.selectedChapterId!,
      start_verse_id: file.selectedStartVerseId!,
      end_verse_id: file.selectedEndVerseId!,
      duration_seconds: Math.round(file.duration),
      upload_status: 'pending' as const,
      publish_status: 'pending' as const,
      check_status: 'pending' as const,
      version: versionMap.get(`${file.selectedChapterId}-${file.selectedStartVerseId}-${file.selectedEndVerseId}`) || 1,
      original_filename: file.file.name,
      file_type: file.file.name.split('.').pop()?.toLowerCase() || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      created_by: userId,
    }));

    // Step 3: Batch insert with chunking for large batches
    const chunkSize = 25; // Smaller chunks for better performance
    const allIds: string[] = [];
    
    if (insertRecords.length <= chunkSize) {
      // Single batch for small batches
      const { data, error } = await supabase
        .from('media_files')
        .insert(insertRecords)
        .select('id');

      if (error) {
        console.error('Error creating pending media files batch:', error);
        throw new Error(`Failed to create pending media file records: ${error.message}`);
      }

      if (!data || data.length !== processedFiles.length) {
        throw new Error(`Expected ${processedFiles.length} records, but got ${data?.length || 0}`);
      }

      return data.map(record => record.id);
    } else {
      // Chunked batch inserts for large batches
      console.log(`📊 Using chunked inserts: ${Math.ceil(insertRecords.length / chunkSize)} batches of ${chunkSize} records`);
      
      for (let i = 0; i < insertRecords.length; i += chunkSize) {
        const chunk = insertRecords.slice(i, i + chunkSize);
        const batchNum = Math.floor(i / chunkSize) + 1;
        const totalBatches = Math.ceil(insertRecords.length / chunkSize);
        
        console.log(`📝 Inserting batch ${batchNum}/${totalBatches} (${chunk.length} records)`);
        const chunkStartTime = Date.now();
        
        const { data, error } = await supabase
          .from('media_files')
          .insert(chunk)
          .select('id');

        if (error) {
          console.error(`Error creating pending media files batch ${batchNum}:`, error);
          throw new Error(`Failed to create pending media file records in batch ${batchNum}: ${error.message}`);
        }

        if (!data || data.length !== chunk.length) {
          throw new Error(`Expected ${chunk.length} records in batch ${batchNum}, but got ${data?.length || 0}`);
        }

        allIds.push(...data.map(record => record.id));
        
        const chunkTime = Date.now() - chunkStartTime;
        console.log(`✅ Batch ${batchNum} completed in ${chunkTime}ms (${(chunkTime / chunk.length).toFixed(1)}ms per record)`);
      }

      return allIds;
    }
  }

  /**
   * Calculate version numbers for multiple files in a single batch query
   */
  private async calculateVersionNumbersBatch(
    audioVersionId: string,
    processedFiles: ProcessedAudioFile[]
  ): Promise<Map<string, number>> {
    // Create unique combinations of chapter/verse ranges
    const uniqueCombinations = new Set<string>();
    const combinationToKey = new Map<string, string>();

    processedFiles.forEach(file => {
      const key = `${file.selectedChapterId}-${file.selectedStartVerseId}-${file.selectedEndVerseId}`;
      const combination = `${file.selectedChapterId}:${file.selectedStartVerseId}:${file.selectedEndVerseId}`;
      uniqueCombinations.add(combination);
      combinationToKey.set(combination, key);
    });

    const versionMap = new Map<string, number>();

    if (uniqueCombinations.size === 0) {
      return versionMap;
    }



    // Process in chunks to handle any batch size efficiently
    const chunkSize = 50; // Increased from 20
    const combinationArray = Array.from(uniqueCombinations);
    
    for (let i = 0; i < combinationArray.length; i += chunkSize) {
      const chunk = combinationArray.slice(i, i + chunkSize);
      
      console.log(`📊 Processing version batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(combinationArray.length / chunkSize)} (${chunk.length} combinations)`);
      
      if (chunk.length === 1) {
        // Single query optimization
        const combination = chunk[0];
        const [chapterId, startVerseId, endVerseId] = combination.split(':');
        const key = combinationToKey.get(combination)!;
        
        const { data } = await supabase
          .from('media_files')
          .select('version')
          .eq('audio_version_id', audioVersionId)
          .eq('chapter_id', chapterId)
          .eq('start_verse_id', startVerseId)
          .eq('end_verse_id', endVerseId)
          .is('deleted_at', null)
          .order('version', { ascending: false })
          .limit(1);
        
        const maxVersion = data?.[0]?.version || 0;
        versionMap.set(key, maxVersion + 1);
      } else {
        // Batch query using OR conditions
        const orConditions: string[] = [];
        
        for (const combination of chunk) {
          const [chapterId, startVerseId, endVerseId] = combination.split(':');
          orConditions.push(`and(chapter_id.eq.${chapterId},start_verse_id.eq.${startVerseId},end_verse_id.eq.${endVerseId})`);
        }
        
        const batchQuery = supabase
          .from('media_files')
          .select('chapter_id, start_verse_id, end_verse_id, version')
          .eq('audio_version_id', audioVersionId)
          .is('deleted_at', null)
          .or(orConditions.join(','));
        const { data, error } = await batchQuery;
        
        if (error) {
          console.error('Batch version query failed, falling back to individual queries:', error);
          // Fallback to individual queries for this chunk
          for (const combination of chunk) {
            const [chapterId, startVerseId, endVerseId] = combination.split(':');
            const key = combinationToKey.get(combination)!;
            
            const { data: individualData } = await supabase
              .from('media_files')
              .select('version')
              .eq('audio_version_id', audioVersionId)
              .eq('chapter_id', chapterId)
              .eq('start_verse_id', startVerseId)
              .eq('end_verse_id', endVerseId)
              .is('deleted_at', null)
              .order('version', { ascending: false })
              .limit(1);
            
            const maxVersion = individualData?.[0]?.version || 0;
            versionMap.set(key, maxVersion + 1);
          }
        } else {
          // Process batch results
          const existingVersions = new Map<string, number>();
          
          data?.forEach(record => {
            const key = `${record.chapter_id}-${record.start_verse_id}-${record.end_verse_id}`;
            const currentMax = existingVersions.get(key) || 0;
            existingVersions.set(key, Math.max(currentMax, record.version || 0));
          });
          
          // Set version numbers for this chunk
          chunk.forEach(combination => {
            const key = combinationToKey.get(combination)!;
            const maxVersion = existingVersions.get(key) || 0;
            versionMap.set(key, maxVersion + 1);
          });
        }
      }
    }
    
    return versionMap;
  }

  /**
   * Finalize multiple media file records after successful upload (batch operation)
   */
  async finalizeMediaFilesBatch(params: {
    updates: Array<{
      mediaFileId: string;
      fileSize: number;
      durationSeconds?: number;
    }>;
  }): Promise<void> {
    const { updates } = params;

    if (updates.length === 0) {
      return;
    }

    // For batch updates, we need to use individual updates since Supabase doesn't support
    // batch updates with different values easily. However, we can parallelize them.
    const updatePromises = updates.map(({ mediaFileId, fileSize, durationSeconds }) =>
      supabase
        .from('media_files')
        .update({
          file_size: fileSize,
          duration_seconds: durationSeconds,
          upload_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', mediaFileId)
    );

    const results = await Promise.allSettled(updatePromises);
    
    const failures = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, index }) => ({
        mediaFileId: updates[index].mediaFileId,
        error: (result as PromiseRejectedResult).reason
      }));

    if (failures.length > 0) {
      console.error('Some media files failed to finalize:', failures);
      const failedIds = failures.map(f => f.mediaFileId).join(', ');
      throw new Error(`Failed to finalize ${failures.length} media file records: ${failedIds}`);
    }

    console.log(`✅ Finalized ${updates.length} media files successfully`);
  }

  /**
   * Finalize a media file record after successful upload
   */
  async finalizeMediaFile(params: {
    mediaFileId: string;
    fileSize: number;
    durationSeconds?: number;
  }): Promise<void> {
    const { mediaFileId, fileSize, durationSeconds } = params;

    const { error } = await supabase
      .from('media_files')
      .update({
        file_size: fileSize,
        duration_seconds: durationSeconds,
        upload_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', mediaFileId);

    if (error) {
      console.error('Error finalizing media file:', error);
      throw new Error(`Failed to finalize media file record: ${error.message}`);
    }
  }

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