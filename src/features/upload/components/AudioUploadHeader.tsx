import { Alert, AlertTitle, AlertDescription, Select, SelectItem } from '../../../shared/design-system/components';

interface AudioUploadHeaderProps {
  selectedAudioVersionId: string;
  onAudioVersionChange: (versionId: string) => void;
  audioVersions?: Array<{ id: string; name: string }>;
  needsAudioVersion: boolean;
}

export function AudioUploadHeader({
  selectedAudioVersionId,
  onAudioVersionChange,
  audioVersions,
  needsAudioVersion
}: AudioUploadHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Upload Audio Files
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Drag and drop your audio files below, or click to browse and select files
          </p>
        </div>

        {/* Audio Version Selection - part of sticky header */}
        {needsAudioVersion ? (
          <Alert variant="warning" className="mt-4">
            <AlertTitle>No Audio Version Found</AlertTitle>
            <AlertDescription>
              This project doesn't have any audio versions configured. Please create an audio version first in the Audio Files page.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mt-4">
            <Select
              label="Select Audio Version"
              value={selectedAudioVersionId}
              onValueChange={onAudioVersionChange}
              placeholder="Choose an audio version"
              required
            >
              {audioVersions?.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        )}
      </div>
    </div>
  );
} 