import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/design-system/hooks/useToast';
import { useB2UploadStore } from '@/shared/stores/mediaFileUpload';
import { useSelectedProject } from '@/features/dashboard/hooks/useSelectedProject';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOptimisticMediaFileUpdates } from '@/shared/hooks/query/media-files';
import type { ProcessedAudioFile } from '@/shared/services/audioFileProcessor';

export function useB2AudioUpload() {
  const { selectedProject } = useSelectedProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addOptimisticUploads, removeOptimisticUploads } = useOptimisticMediaFileUpdates();
  const queryClient = useQueryClient();

  const {
    currentBatch,
    isUploading,
    showProgressToast,
    startUpload,
    cancelUpload,
    closeProgressToast,
    setOnUploadComplete,
    setOnBatchComplete,
    resetUploadState,
  } = useB2UploadStore();

  // Use refs to store current values and avoid infinite loops
  const selectedProjectRef = useRef(selectedProject);
  const removeOptimisticUploadsRef = useRef(removeOptimisticUploads);
  const toastRef = useRef(toast);

  // Update refs when values change
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
    removeOptimisticUploadsRef.current = removeOptimisticUploads;
    toastRef.current = toast;
  });

  // Setup completion callbacks once on mount
  useEffect(() => {
    const handleUploadComplete = (completedFiles: string[], failedFiles: string[]) => {
      console.log('🎉 Upload completed:', { completedFiles, failedFiles });
      
      // Remove optimistic uploads since real data should now be available
      if (selectedProjectRef.current?.id) {
        removeOptimisticUploadsRef.current(selectedProjectRef.current.id);
      }

      // Show completion toast
      if (failedFiles.length > 0) {
        toastRef.current({
          title: 'Upload completed with errors',
          description: `${completedFiles.length} files uploaded successfully, ${failedFiles.length} failed.`,
          variant: 'warning'
        });
      } else {
        toastRef.current({
          title: 'Upload completed successfully',
          description: `Successfully uploaded ${completedFiles.length} files.`,
          variant: 'success'
        });
      }
    };

    const handleBatchComplete = (batchProgress: import('@/shared/services/directUploadService').UploadBatchProgress) => {
      console.log('📊 Batch completed:', batchProgress);
      // Additional batch completion logic can be added here
    };

    setOnUploadComplete(handleUploadComplete);
    setOnBatchComplete(handleBatchComplete);

    // Cleanup on unmount
    return () => {
      setOnUploadComplete(undefined);
      setOnBatchComplete(undefined);
    };
  }, [setOnUploadComplete, setOnBatchComplete]); // Include dependencies

  const handleUpload = useCallback(
    async (
      audioFiles: ProcessedAudioFile[],
      audioVersionId: string
    ) => {
      
      const validFiles = audioFiles.filter(f => 
        f.isValid && 
        f.selectedBookId && 
        f.selectedChapterId && 
        f.selectedStartVerseId && 
        f.selectedEndVerseId
      );

      if (validFiles.length === 0) {
        toast({
          title: 'No valid files to upload',
          description: 'Please ensure all files have book, chapter, and verse selections',
          variant: 'warning'
        });
        return;
      }

      if (!audioVersionId) {
        toast({
          title: 'Audio version required',
          description: 'Please select an audio version before uploading',
          variant: 'error'
        });
        return;
      }

      if (!selectedProject?.target_language_entity_id) {
        toast({
          title: 'Project not selected',
          description: 'Please select a valid project before uploading',
          variant: 'error'
        });
        return;
      }

      if (!user?.id) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to upload files',
          variant: 'error'
        });
        return;
      }

      try {
        console.log('🚀 Starting B2 upload process for', validFiles.length, 'files');

        // Add optimistic uploads to show files in table immediately
        if (selectedProject?.id) {
          console.log('📝 Adding optimistic uploads for immediate UI feedback');
          const optimisticUploads = validFiles.map(file => ({
            fileName: file.file.name,
            bookName: file.filenameParseResult.detectedBook || 'Unknown',
            chapterNumber: file.filenameParseResult.detectedChapter || 0,
            startVerseNumber: file.filenameParseResult.detectedStartVerse || 0,
            endVerseNumber: file.filenameParseResult.detectedEndVerse || file.filenameParseResult.detectedStartVerse || 0,
          }));
          addOptimisticUploads(selectedProject.id, optimisticUploads);
        }

        // Get language entity name for metadata
        const { data: languageEntity } = await import('@/shared/services/supabase').then(({ supabase }) =>
          supabase
            .from('language_entities')
            .select('name')
            .eq('id', selectedProject.target_language_entity_id)
            .single()
        );

        const languageEntityName = languageEntity?.name || 'Unknown';

        // Prepare project data
        const projectData = {
          languageEntityId: selectedProject.target_language_entity_id,
          languageEntityName,
          audioVersionId,
        };

        // Start the upload asynchronously (don't await here)
        startUpload(validFiles, projectData, user.id, queryClient, selectedProject.id).catch((error) => {
          console.error('❌ Upload error:', error);
          
          // Remove optimistic uploads on error
          if (selectedProject?.id) {
            removeOptimisticUploads(selectedProject.id);
          }
          
          toast({
            title: 'Upload failed',
            description: error instanceof Error ? error.message : 'There was an error uploading your files.',
            variant: 'error'
          });
        });

        // Show initial success toast
        toast({
          title: 'Upload Started',
          description: `Processing ${validFiles.length} file${validFiles.length > 1 ? 's' : ''} in the background`,
          variant: 'info'
        });

        console.log('✅ Upload initiated successfully');

      } catch (error) {
        console.error('❌ Upload initialization error:', error);
        
        // Remove optimistic uploads on error
        if (selectedProject?.id) {
          removeOptimisticUploads(selectedProject.id);
        }
        
        toast({
          title: 'Upload failed to start',
          description: error instanceof Error ? error.message : 'There was an error starting the upload.',
          variant: 'error'
        });
        
        // Re-throw so the modal knows there was an error
        throw error;
      }
    },
    [selectedProject, user, startUpload, addOptimisticUploads, removeOptimisticUploads, toast, queryClient]
  );

  const handleCancelUpload = useCallback(() => {
    console.log('🛑 Cancelling upload');
    cancelUpload();
    toast({
      title: 'Upload cancelled',
      description: 'The upload has been cancelled.',
      variant: 'default'
    });
  }, [cancelUpload, toast]);

  const handleCloseProgressToast = useCallback(() => {
    closeProgressToast();
  }, [closeProgressToast]);

  // Get upload summary for UI display
  const uploadSummary = currentBatch ? {
    total: currentBatch.totalFiles,
    completed: currentBatch.completedFiles,
    failed: currentBatch.failedFiles,
    uploading: currentBatch.files.filter(f => f.status === 'uploading').length,
    pending: currentBatch.files.filter(f => f.status === 'pending').length,
  } : null;

  return {
    // State
    currentBatch,
    isUploading,
    showProgressToast,
    uploadSummary,
    
    // Actions
    handleUpload,
    handleCancelUpload,
    handleCloseProgressToast,
    resetUploadState,
    
    // Computed values
    hasActiveUpload: isUploading || showProgressToast,
  };
} 