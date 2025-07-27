import { Card, CardHeader, CardTitle, CardContent, LoadingSpinner } from '../../../shared/design-system/components';
import { type BulkUploadProgress } from '../../../shared/services/bulkUploadService';

interface UploadSummary {
  total: number;
  completed: number;
  failed: number;
  uploading: number;
  pending: number;
}

interface UploadProgressSectionProps {
  uploadSummary: UploadSummary | null;
  uploadProgress: BulkUploadProgress[];
}

export function UploadProgressSection({ uploadSummary, uploadProgress }: UploadProgressSectionProps) {
  if (!uploadSummary) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center mb-4">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {uploadSummary.total}
            </div>
            <div className="text-sm text-gray-600">Total Files</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {uploadSummary.completed}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {uploadSummary.failed}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {uploadSummary.uploading}
            </div>
            <div className="text-sm text-gray-600">Uploading</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {uploadSummary.pending}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>

        {/* Individual file progress */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {uploadProgress.map((progress) => (
            <div key={progress.mediaFileId} className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm font-medium truncate flex-1">{progress.fileName}</span>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  progress.status === 'completed' ? 'bg-green-100 text-green-800' :
                  progress.status === 'failed' ? 'bg-red-100 text-red-800' :
                  progress.status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {progress.status}
                </span>
                {progress.status === 'uploading' && <LoadingSpinner size="sm" />}
                {progress.status === 'completed' && <span className="text-green-600">✓</span>}
                {progress.status === 'failed' && <span className="text-red-600">✗</span>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 