import { Card, CardHeader, CardTitle, CardContent, FileUpload, LoadingSpinner } from '../../../shared/design-system/components';
import { SUPPORTED_AUDIO_TYPES } from '../utils/audioUploadUtils';

interface FileUploadAreaProps {
  onFilesChange: (files: File[]) => void;
  isProcessing: boolean;
}

export function FileUploadArea({ onFilesChange, isProcessing }: FileUploadAreaProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Audio Files</CardTitle>
      </CardHeader>
      <CardContent>
        <FileUpload
          accept="audio/*"
          multiple={true}
          maxFiles={50}
          maxSize={500 * 1024 * 1024} // 500MB per file
          onFilesChange={onFilesChange}
          allowedTypes={SUPPORTED_AUDIO_TYPES}
          uploadText="Drop audio files here or click to select"
          showPreview={false}
          className="min-h-[200px]"
        />

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center">
            <LoadingSpinner className="mr-2" />
            <span className="text-gray-600">Processing audio files...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 