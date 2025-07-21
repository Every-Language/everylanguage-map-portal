import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Progress,
  Alert,
  LoadingSpinner
} from '../../../shared/design-system/components';
import { useBulkUploadProgress } from '../../../shared/hooks/useBulkUploadProgress';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface UploadProgressDisplayProps {
  className?: string;
}

export function UploadProgressDisplay({ className = '' }: UploadProgressDisplayProps) {
  const {
    progress,
    summary,
    isActive,
    stopTracking,
    hasActiveUploads,
    isComplete,
    hasFailures,
    getFilesByStatus
  } = useBulkUploadProgress({
    autoCleanup: false, // Don't auto-cleanup so user can see final results
    showPageLeaveWarning: true
  });

  // Don't show anything if no uploads are active or tracked
  if (!isActive && progress.length === 0) {
    return null;
  }

  const completedFiles = getFilesByStatus('completed');
  const uploadingFiles = getFilesByStatus('uploading');
  const pendingFiles = getFilesByStatus('pending');

  const progressPercentage = summary.total > 0 
    ? Math.round(((summary.completed + summary.failed) / summary.total) * 100) 
    : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'uploading':
        return <LoadingSpinner className="h-5 w-5" />;
      case 'pending':
      default:
        return <ArrowPathIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'uploading':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'pending':
      default:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <Card className={`${className} border-2 ${isComplete ? 'border-green-200' : hasActiveUploads ? 'border-blue-200' : 'border-neutral-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            {hasActiveUploads && <LoadingSpinner className="h-5 w-5" />}
            <span>
              {hasActiveUploads ? 'Uploading Files' : isComplete ? 'Upload Complete' : 'Upload Status'}
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopTracking}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span>{summary.completed + summary.failed} of {summary.total} files</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="w-full h-2"
            color={hasFailures && isComplete ? 'warning' : 'primary'}
          />
          <div className="text-xs text-neutral-600">
            {progressPercentage}% complete
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-neutral-50 rounded-lg">
            <div className="text-lg font-bold text-neutral-700">{summary.pending}</div>
            <div className="text-xs text-neutral-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-700">{summary.uploading}</div>
            <div className="text-xs text-blue-600">Uploading</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-700">{summary.completed}</div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-700">{summary.failed}</div>
            <div className="text-xs text-red-600">Failed</div>
          </div>
        </div>

        {/* Failed Files Alert */}
        {hasFailures && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <div>
              <div className="font-medium">Some uploads failed</div>
              <div className="text-sm mt-1">
                {summary.failed} of {summary.total} files failed to upload. Check the file list below for details.
              </div>
            </div>
          </Alert>
        )}

        {/* Success Message */}
        {isComplete && !hasFailures && (
          <Alert>
            <CheckCircleIcon className="h-4 w-4" />
            <div>
              <div className="font-medium">All uploads completed successfully!</div>
              <div className="text-sm mt-1">
                {summary.completed} files were uploaded successfully.
              </div>
            </div>
          </Alert>
        )}

        {/* File List - Show only if there are many files or failures */}
        {(progress.length > 10 || hasFailures) && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">File Details</h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {progress.map((file) => (
                <div
                  key={file.mediaFileId}
                  className={`flex items-center justify-between p-2 rounded border text-sm ${getStatusColor(file.status)}`}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getStatusIcon(file.status)}
                    <span className="truncate" title={file.fileName}>
                      {file.fileName}
                    </span>
                  </div>
                  <div className="ml-2 text-xs capitalize">
                    {file.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simple file count for small uploads */}
        {progress.length <= 10 && !hasFailures && (
          <div className="text-sm text-neutral-600">
            {hasActiveUploads ? (
              <div className="space-y-1">
                {uploadingFiles.length > 0 && (
                  <div>⬆️ Uploading: {uploadingFiles.map(f => f.fileName).join(', ')}</div>
                )}
                {pendingFiles.length > 0 && (
                  <div>⏳ Pending: {pendingFiles.length} files</div>
                )}
              </div>
            ) : (
              <div>✅ Upload completed: {completedFiles.map(f => f.fileName).join(', ')}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 