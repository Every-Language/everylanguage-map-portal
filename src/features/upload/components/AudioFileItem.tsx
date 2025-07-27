import { Button } from '../../../shared/design-system/components';
import { AudioPlayer } from '../../../shared/design-system/components/AudioPlayer';
import { BookChapterVerseSelector } from './BookChapterVerseSelector';
import { type ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';
import { formatFileSize, formatDuration } from '../utils/audioUploadUtils';

interface AudioFileItemProps {
  file: ProcessedAudioFile;
  projectId: string;
  selectedFileForPreview: string | null;
  isUploading: boolean;
  onPreviewToggle: (fileId: string | null) => void;
  onRemove: (fileId: string) => void;
  onUpdateSelection: (fileId: string, updates: Partial<ProcessedAudioFile>) => void;
}

export function AudioFileItem({
  file,
  projectId,
  selectedFileForPreview,
  isUploading,
  onPreviewToggle,
  onRemove,
  onUpdateSelection
}: AudioFileItemProps) {
  const isPreviewOpen = selectedFileForPreview === file.id;

  return (
    <div
      className={`p-4 border rounded-lg ${
        !file.isValid
          ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
          : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
      }`}
    >
      <div className="space-y-4">
        {/* File Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {file.name}
            </h4>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{formatFileSize(file.size)}</span>
              {file.duration && (
                <span>{formatDuration(file.duration)}</span>
              )}
              {file.filenameParseResult && file.filenameParseResult.confidence !== 'none' && (
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    file.filenameParseResult.confidence === 'high' 
                      ? 'bg-green-100 text-green-800' 
                      : file.filenameParseResult.confidence === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    Detected: {file.filenameParseResult.detectedBook} {file.filenameParseResult.detectedChapter}
                    {file.filenameParseResult.verseRange && ` (v${file.filenameParseResult.verseRange})`}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Preview button */}
            {file.isValid && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreviewToggle(isPreviewOpen ? null : file.id)}
              >
                {isPreviewOpen ? 'Hide' : 'Preview'}
              </Button>
            )}
            
            {/* Remove button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(file.id)}
              disabled={isUploading}
              className="text-red-600 hover:text-red-700"
            >
              Remove
            </Button>
          </div>
        </div>

        {/* Validation Errors */}
        {file.validationErrors.length > 0 && (
          <div className="space-y-1">
            {file.validationErrors.map((error, index) => (
              <div key={index} className="text-sm text-red-600">
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Book/Chapter/Verse Selection */}
        {file.isValid && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Book, Chapter & Verse Selection
            </h5>
            <BookChapterVerseSelector
              projectId={projectId}
              selectedBookId={file.selectedBookId}
              selectedChapterId={file.selectedChapterId}
              selectedStartVerseId={file.selectedStartVerseId}
              selectedEndVerseId={file.selectedEndVerseId}
              onBookChange={(bookId) => onUpdateSelection(file.id, { selectedBookId: bookId })}
              onChapterChange={(chapterId) => onUpdateSelection(file.id, { selectedChapterId: chapterId })}
              onStartVerseChange={(verseId) => onUpdateSelection(file.id, { selectedStartVerseId: verseId })}
              onEndVerseChange={(verseId) => onUpdateSelection(file.id, { selectedEndVerseId: verseId })}
              detectedBook={file.filenameParseResult?.detectedBook}
              detectedChapter={file.filenameParseResult?.detectedChapter}
              detectedStartVerse={file.filenameParseResult?.detectedStartVerse}
              detectedEndVerse={file.filenameParseResult?.detectedEndVerse}
            />
          </div>
        )}

        {/* Audio Preview */}
        {isPreviewOpen && file.isValid && (
          <AudioPlayer
            open={isPreviewOpen}
            onOpenChange={(open) => !open && onPreviewToggle(null)}
            audioUrl={URL.createObjectURL(file.file)}
            title={file.name}
          />
        )}
      </div>
    </div>
  );
} 