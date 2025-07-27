import React from 'react';
import { Progress } from '@/shared/design-system/components/Progress';
import { Card } from '@/shared/design-system/components/Card';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useUploadStore } from '@/shared/stores/upload';

interface TextUploadProgressProps {
  onClose?: () => void;
}

export function TextUploadProgress({ onClose }: TextUploadProgressProps) {
  const { 
    isTextUploading, 
    textUploadProgress, 
    showTextProgress,
    clearTextProgress 
  } = useUploadStore();

  if (!showTextProgress || !textUploadProgress) {
    return null;
  }

  const { completed, total, currentBatch, totalBatches } = textUploadProgress;
  const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = !isTextUploading && completed === total;

  const handleClose = () => {
    clearTextProgress();
    onClose?.();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="p-4 shadow-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {isComplete ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            <h3 className="font-medium text-gray-900">
              {isComplete ? 'Text Upload Complete' : 'Uploading Verse Texts'}
            </h3>
          </div>
          {isComplete && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Overall Progress */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{completed.toLocaleString()} / {total.toLocaleString()} verses</span>
            </div>
            <Progress 
              value={progressPercentage} 
              size="md"
              color={isComplete ? "success" : "primary"}
            />
            <div className="text-xs text-gray-500 mt-1">
              {progressPercentage}% complete
            </div>
          </div>

          {/* Batch Progress */}
          {!isComplete && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Current Batch</span>
                <span>{currentBatch} / {totalBatches}</span>
              </div>
              <Progress 
                value={totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0} 
                size="sm"
                color="primary"
              />
            </div>
          )}

          {/* Status Message */}
          <div className="text-xs text-gray-500">
            {isComplete ? (
              <span className="text-green-600">All verse texts uploaded successfully!</span>
            ) : (
              <span>Processing batch {currentBatch} of {totalBatches}...</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
} 