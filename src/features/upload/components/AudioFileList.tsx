import { Card, CardHeader, CardTitle, CardContent, Button, Alert, AlertTitle, AlertDescription } from '../../../shared/design-system/components';
import { AudioFileItem } from './AudioFileItem';
import { type ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';

interface AudioFileListProps {
  audioFiles: ProcessedAudioFile[];
  selectedFileForPreview: string | null;
  isUploading: boolean;
  filesReadyForUpload: number;
  invalidFilesCount: number;
  needsAudioVersion: boolean;
  onPreviewToggle: (fileId: string | null) => void;
  onRemoveFile: (fileId: string) => void;
  onUpdateFileSelection: (fileId: string, updates: Partial<ProcessedAudioFile>) => void;
  onClearAllFiles: () => void;
  onUpload: () => void;
}

export function AudioFileList({
  audioFiles,
  selectedFileForPreview,
  isUploading,
  filesReadyForUpload,
  invalidFilesCount,
  needsAudioVersion,
  onPreviewToggle,
  onRemoveFile,
  onUpdateFileSelection,
  onClearAllFiles,
  onUpload
}: AudioFileListProps) {
  if (audioFiles.length === 0) {
    return null;
  }

  return (
    <>
      {/* Error Summary */}
      {invalidFilesCount > 0 && (
        <Alert variant="error">
          <AlertTitle>File Validation Issues</AlertTitle>
          <AlertDescription>
            {invalidFilesCount} file(s) have validation errors. 
            Please review the file list below and fix any issues before uploading.
          </AlertDescription>
        </Alert>
      )}

      {/* File List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Selected Files ({audioFiles.length})</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAllFiles}
              disabled={isUploading}
            >
              Clear All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onUpload}
              disabled={filesReadyForUpload === 0 || isUploading || needsAudioVersion}
              loading={isUploading}
              loadingText="Uploading..."
            >
              Upload Files ({filesReadyForUpload})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 max-h-[600px] overflow-y-auto">
            {audioFiles.map((file) => (
              <AudioFileItem
                key={file.id}
                file={file}
                selectedFileForPreview={selectedFileForPreview}
                isUploading={isUploading}
                onPreviewToggle={onPreviewToggle}
                onRemove={onRemoveFile}
                onUpdateSelection={onUpdateFileSelection}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
} 