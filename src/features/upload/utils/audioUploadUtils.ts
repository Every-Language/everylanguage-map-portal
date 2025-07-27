import { type ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';

// Audio file types supported
export const SUPPORTED_AUDIO_TYPES = [
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

export interface AudioUploadStats {
  totalFiles: number;
  totalSize: number;
  estimatedDuration: number;
  validFiles: number;
  invalidFiles: number;
  parsingStats?: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    noMatch: number;
    booksDetected: number;
    chaptersDetected: number;
    versesDetected: number;
  };
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format duration
export function formatDuration(seconds: number): string {
  if (isNaN(seconds)) return 'Unknown';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Calculate upload statistics
export function calculateUploadStats(files: ProcessedAudioFile[]): AudioUploadStats {
  const validFiles = files.filter(f => f.isValid);
  const invalidFiles = files.filter(f => !f.isValid);
  
  // Calculate parsing statistics
  const parsingStats = {
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    noMatch: 0,
    booksDetected: 0,
    chaptersDetected: 0,
    versesDetected: 0
  };
  
  files.forEach(file => {
    if (file.filenameParseResult) {
      switch (file.filenameParseResult.confidence) {
        case 'high':
          parsingStats.highConfidence++;
          break;
        case 'medium':
          parsingStats.mediumConfidence++;
          break;
        case 'low':
          parsingStats.lowConfidence++;
          break;
        case 'none':
          parsingStats.noMatch++;
          break;
      }
      
      if (file.filenameParseResult.detectedBook) parsingStats.booksDetected++;
      if (file.filenameParseResult.detectedChapter) parsingStats.chaptersDetected++;
      if (file.filenameParseResult.detectedStartVerse || file.filenameParseResult.detectedEndVerse) {
        parsingStats.versesDetected++;
      }
    } else {
      parsingStats.noMatch++;
    }
  });
  
  return {
    totalFiles: files.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    estimatedDuration: validFiles.reduce((sum, file) => sum + (file.duration || 0), 0),
    validFiles: validFiles.length,
    invalidFiles: invalidFiles.length,
    parsingStats
  };
} 