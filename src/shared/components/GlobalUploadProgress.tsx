import { useB2UploadStore } from '../stores/b2Upload';
import { UploadProgressToast } from './UploadProgressToast';

export function GlobalUploadProgress() {
  const {
    currentBatch,
    showProgressToast,
    closeProgressToast,
    cancelUpload,
    isUploading,
  } = useB2UploadStore();

  return (
    <UploadProgressToast
      batchProgress={currentBatch}
      isVisible={showProgressToast}
      onClose={closeProgressToast}
      onCancel={isUploading ? cancelUpload : undefined}
    />
  );
} 