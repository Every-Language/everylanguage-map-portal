import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/design-system/components';
import { type AudioUploadStats, formatFileSize, formatDuration } from '../utils/audioUploadUtils';

interface UploadStatsSectionProps {
  uploadStats: AudioUploadStats;
  filesReadyForUpload: number;
}

export function UploadStatsSection({ uploadStats, filesReadyForUpload }: UploadStatsSectionProps) {
  if (uploadStats.totalFiles === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {uploadStats.totalFiles}
            </div>
            <div className="text-sm text-gray-600">Total Files</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {filesReadyForUpload}
            </div>
            <div className="text-sm text-gray-600">Ready for Upload</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {formatFileSize(uploadStats.totalSize)}
            </div>
            <div className="text-sm text-gray-600">Total Size</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {formatDuration(uploadStats.estimatedDuration)}
            </div>
            <div className="text-sm text-gray-600">Duration</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 