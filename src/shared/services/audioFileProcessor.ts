import { parseFilename, resolveFullChapterEndVerse, resolveFullChapterEndVersesBatch, type ParsedFilename } from './filenameParser';

export interface AudioMetadata {
  duration: number;
  verseTimestamps: Array<never>; // Empty array since we're not extracting verses
  hasVerseData: false; // Always false since we're not extracting
}

export interface ProcessedAudioFile {
  // File properties
  file: File;
  name: string; // Duplicate for easy access
  size: number; // Duplicate for easy access
  type: string; // Duplicate for easy access
  
  // Metadata
  id: string;
  duration: number;
  filenameParseResult: ParsedFilename;
  audioMetadata: AudioMetadata;
  
  // UI state
  selectedBookId?: string;
  selectedChapterId?: string;
  selectedStartVerseId?: string;
  selectedEndVerseId?: string;
  
  // Validation state
  validationErrors: string[];
  isValid: boolean;
  
  // Upload state
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  uploadError?: string;
}

export class AudioFileProcessor {
  async processFile(file: File, bibleVersionId?: string): Promise<ProcessedAudioFile> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Parse filename
    let filenameParseResult = parseFilename(file.name);
    
    // Resolve full chapter end verses if needed and we have a bible version
    if (filenameParseResult.isFullChapter && bibleVersionId) {
      try {
        filenameParseResult = await resolveFullChapterEndVerse(filenameParseResult, bibleVersionId);
      } catch (error) {
        console.warn('Failed to resolve full chapter end verse for', file.name, error);
      }
    }
    
    // Extract basic metadata (duration only)
    const audioMetadata = await this.extractBasicMetadata(file);
    
    // Validate
    const validationErrors = this.validateFile(file, filenameParseResult, audioMetadata);
    
    // Create processed file object with file as a property
    const processedFile: ProcessedAudioFile = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id,
      duration: audioMetadata.duration,
      filenameParseResult,
      audioMetadata,
      validationErrors,
      isValid: validationErrors.length === 0,
      uploadProgress: 0,
      uploadStatus: 'pending'
    };
    
    // Note: Book/chapter/verse selection is now handled by BookChapterVerseSelector
    // using the detected values from filenameParseResult
    
    return processedFile;
  }

  private async extractBasicMetadata(file: File): Promise<AudioMetadata> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeEventListener('loadedmetadata', onLoad);
        audio.removeEventListener('error', onError);
      };

      const onLoad = () => {
        cleanup();
        resolve({
          duration: audio.duration || 0,
          verseTimestamps: [],
          hasVerseData: false
        });
      };

      const onError = () => {
        cleanup();
        resolve({
          duration: 0,
          verseTimestamps: [],
          hasVerseData: false
        });
      };

      audio.addEventListener('loadedmetadata', onLoad);
      audio.addEventListener('error', onError);
      
      // Timeout fallback - reduced to 3 seconds for faster processing
      setTimeout(() => {
        cleanup();
        resolve({
          duration: 0,
          verseTimestamps: [],
          hasVerseData: false
        });
      }, 3000);

      audio.src = url;
    });
  }

  private validateFile(file: File, parsed: ParsedFilename, metadata: AudioMetadata): string[] {
    const errors: string[] = [];
    
    // File validation
    if (file.size > 500 * 1024 * 1024) { // 500MB
      errors.push('File size exceeds 500MB limit');
    }
    
    if (file.size === 0) {
      errors.push('File appears to be empty');
    }

    // Check if it's an audio file
    const supportedTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/m4a',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
      'audio/webm'
    ];
    
    const supportedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!supportedTypes.includes(file.type) && !supportedExtensions.includes(fileExtension)) {
      errors.push('Unsupported file type. Please use MP3, WAV, M4A, AAC, OGG, or WebM files');
    }
    
    if (metadata.duration === 0) {
      errors.push('Could not determine audio duration - file may be corrupted');
    }
    
    // Filename parsing validation (warning, not error)
    if (parsed.confidence === 'none') {
      errors.push('Could not auto-detect book/chapter from filename - manual selection required');
    }
    
    return errors;
  }

  async processFiles(files: File[], bibleVersionId?: string): Promise<ProcessedAudioFile[]> {
    if (files.length === 0) {
      return [];
    }

    console.log(`📁 Processing ${files.length} files${bibleVersionId ? ' with bible version resolution' : ''}...`);
    const startTime = Date.now();

    // Step 1: Parse all filenames first (no DB calls)
    const filenameParseResults = files.map(file => ({
      file,
      parseResult: parseFilename(file.name)
    }));

    // Step 2: Batch resolve full chapter end verses (single DB query for all)
    let resolvedParseResults: typeof filenameParseResults;
    if (bibleVersionId) {
      const batchStartTime = Date.now();
      const parseResults = filenameParseResults.map(item => item.parseResult);
      const resolvedResults = await resolveFullChapterEndVersesBatch(parseResults, bibleVersionId);
      
      resolvedParseResults = filenameParseResults.map((item, index) => ({
        file: item.file,
        parseResult: resolvedResults[index]
      }));
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`✅ Batch chapter resolution completed in ${batchTime}ms`);
    } else {
      resolvedParseResults = filenameParseResults;
    }

    // Step 3: Process files in parallel (extract metadata, validate)
    const metadataStartTime = Date.now();
    const promises = resolvedParseResults.map(async ({ file, parseResult }) => {
      try {
        return await this.processFileWithParsedResult(file, parseResult);
      } catch (error) {
        console.error('Failed to process file:', file.name, error);
        
        // Create error file entry
        return {
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          duration: 0,
          filenameParseResult: parseResult,
          audioMetadata: { duration: 0, verseTimestamps: [], hasVerseData: false as const },
          validationErrors: [`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          isValid: false,
          uploadProgress: 0,
          uploadStatus: 'error' as const,
          uploadError: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    const processedFiles = await Promise.all(promises);
    
    const metadataTime = Date.now() - metadataStartTime;
    const totalTime = Date.now() - startTime;
    const avgTimePerFile = totalTime / files.length;
    
    console.log(`🎉 Processed ${files.length} files in ${totalTime}ms (${avgTimePerFile.toFixed(1)}ms per file)`);
    console.log(`   • Metadata extraction: ${metadataTime}ms`);
    
    return processedFiles;
  }

  /**
   * Process a single file with an already-parsed filename result
   * This is used internally by processFiles for better performance
   */
  private async processFileWithParsedResult(file: File, filenameParseResult: ParsedFilename): Promise<ProcessedAudioFile> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract basic metadata (duration only)
    const audioMetadata = await this.extractBasicMetadata(file);
    
    // Validate
    const validationErrors = this.validateFile(file, filenameParseResult, audioMetadata);
    
    // Create processed file object with file as a property
    const processedFile: ProcessedAudioFile = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id,
      duration: audioMetadata.duration,
      filenameParseResult,
      audioMetadata,
      validationErrors,
      isValid: validationErrors.length === 0,
      uploadProgress: 0,
      uploadStatus: 'pending'
    };
    
    return processedFile;
  }

  // Helper method to update a processed file
  updateProcessedFile(file: ProcessedAudioFile, updates: Partial<ProcessedAudioFile>): ProcessedAudioFile {
    const updatedFile: ProcessedAudioFile = { ...file, ...updates };
    
    // Re-validate if validation-related fields changed
    if (updates.selectedBookId || updates.selectedChapterId || updates.selectedStartVerseId || updates.selectedEndVerseId) {
      const hasAllRequired = !!(updatedFile.selectedBookId && updatedFile.selectedChapterId && updatedFile.selectedStartVerseId && updatedFile.selectedEndVerseId);
      
      if (hasAllRequired && updatedFile.validationErrors.includes('Could not auto-detect book/chapter from filename - manual selection required')) {
        updatedFile.validationErrors = updatedFile.validationErrors.filter(error => 
          !error.includes('manual selection required')
        );
        updatedFile.isValid = updatedFile.validationErrors.length === 0;
      }
    }
    
    return updatedFile;
  }
} 