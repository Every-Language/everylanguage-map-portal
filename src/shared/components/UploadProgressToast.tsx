import { useState, useEffect } from 'react';
import { Progress, Button, Card } from '../design-system/components';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import type { UploadBatchProgress, UploadFileProgress } from '../services/directUploadService';
import { cn } from '../design-system/utils';

interface UploadProgressToastProps {
  batchProgress: UploadBatchProgress | null;
  isVisible: boolean;
  onClose: () => void;
  onCancel?: () => void;
}

export function UploadProgressToast({ 
  batchProgress, 
  isVisible, 
  onClose, 
  onCancel 
}: UploadProgressToastProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Auto-collapse when upload completes and remove loading state
  useEffect(() => {
    if (batchProgress && (batchProgress.completedFiles + batchProgress.failedFiles) === batchProgress.totalFiles) {
      setIsCompleted(true);
      // Auto-close toast after completion (don't just collapse)
      setTimeout(() => onClose(), 5000);
    } else if (batchProgress && (batchProgress.completedFiles + batchProgress.failedFiles) < batchProgress.totalFiles) {
      // Reset completion state if upload is still in progress (for new uploads)
      setIsCompleted(false);
    }
  }, [batchProgress, onClose]);

  if (!isVisible || !batchProgress) {
    return null;
  }

  const totalProgress = batchProgress.totalFiles > 0 
    ? ((batchProgress.completedFiles + batchProgress.failedFiles) / batchProgress.totalFiles) * 100 
    : 0;
  
  const hasErrors = batchProgress.failedFiles > 0;
  const isUploading = (batchProgress.completedFiles + batchProgress.failedFiles) < batchProgress.totalFiles;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 shadow-lg">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {isCompleted ? (
                hasErrors ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                ) : (
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  </div>
                )
              ) : (
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              )}
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isCompleted 
                  ? hasErrors 
                    ? `Upload completed with ${batchProgress.failedFiles} error${batchProgress.failedFiles > 1 ? 's' : ''}`
                    : 'Upload complete'
                  : 'Uploading files...'
                }
              </h3>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronUpIcon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{batchProgress.completedFiles + batchProgress.failedFiles} of {batchProgress.totalFiles} files</span>
              <span>{Math.round(totalProgress)}%</span>
            </div>
            <Progress 
              value={totalProgress} 
              className="h-2"
              color={hasErrors ? 'warning' : 'primary'}
            />
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-4 space-y-3">
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  File Details
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {batchProgress.files.map((file, index) => (
                    <FileProgressItem key={index} file={file} />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                {isUploading && onCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Cancel Upload
                  </Button>
                )}
                <div className="flex-1" />
                {isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Component for individual file progress
function FileProgressItem({ file }: { file: UploadFileProgress }) {
  const progress = file.fileSize > 0 ? (file.uploadedBytes / file.fileSize) * 100 : 0;
  
  const getStatusColor = () => {
    switch (file.status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'uploading':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return <CheckCircleIcon className="h-3 w-3" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-3 w-3" />;
      case 'uploading':
        return (
          <div className="relative">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            <div className="absolute -top-0.5 -left-0.5 h-3 w-3 bg-blue-300 rounded-full animate-ping opacity-75" />
          </div>
        );
      default:
        return <div className="h-2 w-2 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <div className={cn("flex-shrink-0", getStatusColor())}>
          {getStatusIcon()}
        </div>
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
          {file.fileName}
        </span>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {file.status === 'uploading' && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {Math.round(progress)}%
          </span>
        )}
        <span className={cn("text-xs capitalize", getStatusColor())}>
          {file.status}
        </span>
      </div>
      {file.error && (
        <div className="mt-1">
          <span className="text-xs text-red-600 dark:text-red-400">{file.error}</span>
        </div>
      )}
    </div>
  );
}