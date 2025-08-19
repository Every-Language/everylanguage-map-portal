
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../shared/design-system/components/Button';
import { Progress } from '../../../shared/design-system/components/Progress';
import { LoadingSpinner } from '../../../shared/design-system/components/LoadingSpinner';
import { useB2UploadStore } from '../../../shared/stores/mediaFileUpload';
import type { UploadProgressData } from '../hooks/useUploadProgress';
import type { UploadFileProgress } from '../../../shared/services/directUploadService';

export interface UploadProgressDisplayProps {
  className?: string;
  /** Optional: Use external progress data instead of the upload store */
  externalProgressData?: UploadProgressData | null;
  /** Optional: Control visibility externally */
  visible?: boolean;
  /** Optional: External close handler */
  onClose?: () => void;
}

export function UploadProgressDisplay({ 
  className = '', 
  externalProgressData = null,
  visible = undefined,
  onClose = undefined
}: UploadProgressDisplayProps) {
  const { 
    currentBatch, 
    isUploading,
    showProgressToast,
    closeProgressToast
  } = useB2UploadStore();

  // Use external data if provided, otherwise fall back to store
  const progressData = externalProgressData;
  const storeProgress = currentBatch?.files || [];
  
  // Determine visibility
  const shouldShow = visible !== undefined ? visible : (showProgressToast && storeProgress.length > 0);
  
  if (!shouldShow && !progressData) {
    return null;
  }

  // Calculate summary from new backend data structure or fall back to store data
  let summary;
  let progressPercentage;
  let isComplete;
  let hasActiveUploads;

  if (progressData) {
    // Use new backend data structure
    summary = {
      total: progressData.totalFiles,
      completed: progressData.completedCount,
      failed: progressData.failedCount,
      uploading: progressData.uploadingCount,
      pending: progressData.pendingCount,
    };
    progressPercentage = progressData.totalProgress;
    isComplete = progressData.completedCount + progressData.failedCount === progressData.totalFiles;
    hasActiveUploads = progressData.isUploading;
  } else {
    // Fall back to store data structure
    summary = {
      total: storeProgress.length,
      completed: storeProgress.filter((p: UploadFileProgress) => p.status === 'completed').length,
      failed: storeProgress.filter((p: UploadFileProgress) => p.status === 'failed').length,
      uploading: storeProgress.filter((p: UploadFileProgress) => p.status === 'uploading').length,
      pending: storeProgress.filter((p: UploadFileProgress) => p.status === 'pending').length,
    };
    isComplete = summary.total > 0 && (summary.completed + summary.failed) === summary.total;
    hasActiveUploads = isUploading || summary.uploading > 0 || summary.pending > 0;
    progressPercentage = summary.total > 0 
      ? Math.round(((summary.completed + summary.failed) / summary.total) * 100) 
      : 0;
  }

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else {
      closeProgressToast();
    }
  };

  return (
    <div className={`${className} w-full bg-secondary-50 dark:bg-secondary-900/20 border-b border-secondary-200 dark:border-secondary-700`}>
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          {/* Progress info */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="text-sm font-medium text-secondary-800 dark:text-secondary-200">
              {hasActiveUploads ? 'Uploading' : isComplete ? 'Upload Complete' : 'Upload Status'}
            </div>
            
            <div className="flex-1 max-w-md">
              <Progress 
                value={progressPercentage} 
                className="w-full h-2"
              />
            </div>
            
            <div className="text-sm text-secondary-700 dark:text-secondary-300">
              {progressPercentage}% - {summary.completed + summary.failed} of {summary.total} files
              {summary.uploading > 0 && ` (${summary.uploading} uploading)`}
              {summary.pending > 0 && summary.uploading === 0 && ` (${summary.pending} pending)`}
            </div>
          </div>

          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{summary.pending}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-300">Pending</div>
          </div>
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-lg font-bold text-blue-800 dark:text-blue-200 flex items-center justify-center">
              {summary.uploading}
              {summary.uploading > 0 && <LoadingSpinner size="sm" className="ml-1" />}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-300">Uploading</div>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-lg font-bold text-green-800 dark:text-green-200">{summary.completed}</div>
            <div className="text-xs text-green-600 dark:text-green-300">Completed</div>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-lg font-bold text-red-800 dark:text-red-200">{summary.failed}</div>
            <div className="text-xs text-red-600 dark:text-red-300">Failed</div>
          </div>
        </div>

        {/* Individual file progress - show if we have detailed file data */}
        {progressData?.files && progressData.files.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 p-2">
            {progressData.files.map((file) => (
              <div key={file.mediaFileId} className="flex items-center justify-between p-2 bg-secondary-50 dark:bg-secondary-700 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                    {file.fileName}
                  </p>
                  {file.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 truncate">
                      Error: {file.error}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-3">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    file.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    file.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                    file.status === 'uploading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}>
                    {file.status}
                  </span>
                  {file.status === 'uploading' && <LoadingSpinner size="sm" />}
                  {file.status === 'completed' && <span className="text-green-600 dark:text-green-400">✓</span>}
                  {file.status === 'failed' && <span className="text-red-600 dark:text-red-400">✗</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fall back to store progress display if no detailed backend data */}
        {!progressData?.files && storeProgress.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 p-2">
            {storeProgress.map((progress: UploadFileProgress) => (
              <div key={progress.fileName} className="flex items-center justify-between p-2 bg-secondary-50 dark:bg-secondary-700 rounded">
                <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate flex-1">
                  {progress.fileName}
                </span>
                <div className="flex items-center space-x-2 ml-3">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    progress.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    progress.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                    progress.status === 'uploading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}>
                    {progress.status}
                  </span>
                  {progress.status === 'uploading' && <LoadingSpinner size="sm" />}
                  {progress.status === 'completed' && <span className="text-green-600 dark:text-green-400">✓</span>}
                  {progress.status === 'failed' && <span className="text-red-600 dark:text-red-400">✗</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 