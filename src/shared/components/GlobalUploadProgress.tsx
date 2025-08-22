import { useR2UploadStore } from '../stores/mediaFileUpload';
import { UploadProgressToast } from './UploadProgressToast';

export function GlobalUploadProgress() {
  const {
    currentBatch,
    showProgressToast,
    closeProgressToast,
    cancelUpload,
    isUploading,
  } = useR2UploadStore();

  return (
    <UploadProgressToast
      batchProgress={currentBatch}
      isVisible={showProgressToast}
      onClose={closeProgressToast}
      onCancel={isUploading ? cancelUpload : undefined}
    />
  );
} 