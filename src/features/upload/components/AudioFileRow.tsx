import React from 'react';
import { Button, Progress } from '../../../shared/design-system/components';
import { AudioPlayer } from '../../../shared/design-system/components/AudioPlayer';
import { BookChapterVerseSelector } from './BookChapterVerseSelector';
import { PlayIcon, PauseIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';

interface AudioFileRowProps {
  file: ProcessedAudioFile;
  projectId: string;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onDelete: () => void;
  onBookChange: (bookId: string) => void;
  onChapterChange: (chapterId: string) => void;
  onStartVerseChange: (verseId: string) => void;
  onEndVerseChange: (verseId: string) => void;
}

export function AudioFileRow({
  file,
  projectId,
  isPlaying,
  onPlay,
  onPause,
  onDelete,
  onBookChange,
  onChapterChange,
  onStartVerseChange,
  onEndVerseChange
}: AudioFileRowProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (!file.isValid) return 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700';
    if (file.uploadStatus === 'success') return 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700';
    if (file.uploadStatus === 'uploading') return 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700';
    return 'border-neutral-200 bg-white dark:bg-neutral-800 dark:border-neutral-700';
  };

  return (
    <div className={`border rounded-lg p-4 space-y-4 ${getStatusColor()}`}>
      {/* File Info Row */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            {/* File Name and Info */}
            <div className="flex-1">
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {file.name}
              </h4>
              <div className="flex items-center space-x-4 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                <span>{formatFileSize(file.size)}</span>
                {file.duration > 0 && <span>{formatDuration(file.duration)}</span>}
                {file.audioMetadata.hasVerseData && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    ✓ {file.audioMetadata.verseTimestamps.length} verses detected
                  </span>
                )}
                {file.filenameParseResult.confidence && file.filenameParseResult.confidence !== 'none' && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    📄 {file.filenameParseResult.confidence} confidence parse
                  </span>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center space-x-2">
              {/* Play/Pause Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={isPlaying ? onPause : onPlay}
                disabled={!file.isValid || file.uploadStatus === 'uploading'}
                className="flex items-center space-x-1"
              >
                {isPlaying ? (
                  <>
                    <PauseIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Pause</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Play</span>
                  </>
                )}
              </Button>

              {/* Delete Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={file.uploadStatus === 'uploading'}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:border-red-300"
              >
                <TrashIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Book/Chapter/Verse Selectors */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
          Bible Reference
        </h5>
        <BookChapterVerseSelector
          projectId={projectId}
          selectedBookId={file.selectedBookId}
          selectedChapterId={file.selectedChapterId}
          selectedStartVerseId={file.selectedStartVerseId}
          selectedEndVerseId={file.selectedEndVerseId}
          onBookChange={onBookChange}
          onChapterChange={onChapterChange}
          onStartVerseChange={onStartVerseChange}
          onEndVerseChange={onEndVerseChange}
          disabled={file.uploadStatus === 'uploading'}
          detectedBook={file.filenameParseResult.detectedBook}
          detectedChapter={file.filenameParseResult.detectedChapter}
        />
      </div>

      {/* Audio Player (when playing) */}
      {isPlaying && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
            Audio Player
          </h5>
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border">
            <AudioPlayer
              src={URL.createObjectURL(file)}
              showPlaybackSpeed={true}
              showTimestamp={true}
              aria-label={`Audio player for ${file.name}`}
            />
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {file.uploadStatus === 'uploading' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
              Upload Progress
            </h5>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              {file.uploadProgress}%
            </span>
          </div>
          <Progress value={file.uploadProgress} className="w-full" />
        </div>
      )}

      {/* Upload Success */}
      {file.uploadStatus === 'success' && (
        <div className="flex items-center space-x-2 text-xs text-green-600 dark:text-green-400">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="font-medium">Upload completed successfully</span>
        </div>
      )}

      {/* Validation Errors */}
      {file.validationErrors.length > 0 && (
        <div className="space-y-1">
          <h5 className="text-xs font-medium text-red-700 dark:text-red-300 uppercase tracking-wide">
            Issues Found
          </h5>
          {file.validationErrors.map((error, index) => (
            <div key={index} className="flex items-start space-x-2 text-xs text-red-600 dark:text-red-400">
              <span className="text-red-500 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload Error */}
      {file.uploadError && (
        <div className="space-y-1">
          <h5 className="text-xs font-medium text-red-700 dark:text-red-300 uppercase tracking-wide">
            Upload Error
          </h5>
          <div className="flex items-start space-x-2 text-xs text-red-600 dark:text-red-400">
            <span className="text-red-500 mt-0.5">✕</span>
            <span>{file.uploadError}</span>
          </div>
        </div>
      )}
    </div>
  );
} 