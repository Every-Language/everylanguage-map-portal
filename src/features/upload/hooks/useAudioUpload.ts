import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/shared/design-system/hooks/useToast';
import { useUploadStore } from '@/shared/stores/upload';
import { createBulkUploadFiles } from '@/shared/services/bulkUploadService';
import { supabase } from '@/shared/services/supabase';
import { useSelectedProject } from '@/features/dashboard/hooks/useSelectedProject';
import { useOptimisticMediaFileUpdates } from '@/shared/hooks/query/media-files';
import type { ProcessedAudioFile } from '@/shared/services/audioFileProcessor';

export function useAudioUpload() {
  const [audioFiles, setAudioFiles] = useState<ProcessedAudioFile[]>([]);
  const [selectedAudioVersionId, setSelectedAudioVersionId] = useState<string>('');
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { selectedProject } = useSelectedProject();
  const { addOptimisticUploads, removeOptimisticUploads } = useOptimisticMediaFileUpdates();
  const completionHandledRef = useRef(false);
  
  // Use the global upload store
  const { 
    startBulkUpload, 
    isUploading, 
    uploadProgress,
    setShowProgress,
    setOnUploadComplete
  } = useUploadStore();

  // Register completion callback when component mounts
  useEffect(() => {
    const handleUploadComplete = () => {
      // Prevent multiple calls
      if (completionHandledRef.current) {
        console.log('🚫 Upload completion already handled, skipping');
        return;
      }
      
      completionHandledRef.current = true;
      console.log('🔄 Audio upload completed - triggering table refresh');
      
      if (selectedProject?.id) {
        console.log('📋 Removing optimistic uploads and refreshing data');
        // Remove optimistic uploads since real data should now be available
        removeOptimisticUploads(selectedProject.id);
        
        // Show completion toast
        const completedCount = uploadProgress.filter(p => p.status === 'completed').length;
        const failedCount = uploadProgress.filter(p => p.status === 'failed').length;
        
        if (failedCount > 0) {
          toast({
            title: 'Upload completed with errors',
            description: `${completedCount} files uploaded successfully, ${failedCount} failed.`,
            variant: 'warning'
          });
        } else {
          toast({
            title: 'Upload completed',
            description: `Successfully uploaded all ${completedCount} files.`,
            variant: 'success'
          });
        }
      }
      
      // Reset the flag after a delay
      setTimeout(() => {
        completionHandledRef.current = false;
      }, 5000);
    };

    setOnUploadComplete(handleUploadComplete);
    
    // Cleanup on unmount
    return () => {
      setOnUploadComplete(undefined);
      completionHandledRef.current = false;
    };
  }, [selectedProject?.id, removeOptimisticUploads, uploadProgress, toast, setOnUploadComplete]);

  // Handle upload with global store integration
  const handleUpload = useCallback(async () => {
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

    if (!selectedAudioVersionId) {
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

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Show progress UI immediately
      setShowProgress(true);

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

      // Create bulk upload files
      const bulkFiles = createBulkUploadFiles(
        validFiles,
        selectedProject.target_language_entity_id,
        selectedAudioVersionId
      );

      console.log('🚀 Starting bulk upload with files:', bulkFiles);
      
      // Start the upload through the store (which handles progress tracking)
      const result = await startBulkUpload(bulkFiles, session.access_token);
      
      console.log('📋 Bulk upload initiated:', result);

      // NOTE: Don't call handleUploadComplete here! 
      // The upload store will handle progress tracking and completion
      // handleUploadComplete should only be called when upload is actually done
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Remove optimistic uploads on error
      if (selectedProject?.id) {
        removeOptimisticUploads(selectedProject.id);
      }
      
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'There was an error uploading your files.',
        variant: 'error'
      });
    }
  }, [audioFiles, selectedAudioVersionId, selectedProject, toast, startBulkUpload, setShowProgress, addOptimisticUploads, removeOptimisticUploads]);

  // Update file with book/chapter/verse selections
  const updateFileSelection = useCallback((fileId: string, updates: Partial<ProcessedAudioFile>) => {
    setAudioFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, ...updates }
          : file
      )
    );
  }, []);

  // Remove file from list
  const removeFile = useCallback((fileId: string) => {
    setAudioFiles(prev => prev.filter(f => f.id !== fileId));
    
    if (selectedFileForPreview === fileId) {
      setSelectedFileForPreview(null);
    }
  }, [selectedFileForPreview]);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setAudioFiles([]);
    setSelectedFileForPreview(null);
  }, []);

  // Get files ready for upload count
  const filesReadyForUpload = audioFiles.filter(f => 
    f.isValid && 
    f.selectedBookId && 
    f.selectedChapterId && 
    f.selectedStartVerseId && 
    f.selectedEndVerseId
  ).length;

  // Get upload summary for progress display from global store
  const uploadSummary = uploadProgress.length > 0 ? {
    total: uploadProgress.length,
    completed: uploadProgress.filter(p => p.status === 'completed').length,
    failed: uploadProgress.filter(p => p.status === 'failed').length,
    uploading: uploadProgress.filter(p => p.status === 'uploading').length,
    pending: uploadProgress.filter(p => p.status === 'pending').length,
  } : null;

  return {
    // State
    audioFiles,
    setAudioFiles,
    isUploading,
    selectedAudioVersionId,
    setSelectedAudioVersionId,
    uploadProgress,
    selectedFileForPreview,
    setSelectedFileForPreview,
    
    // Computed values
    filesReadyForUpload,
    uploadSummary,
    
    // Actions
    handleUpload,
    updateFileSelection,
    removeFile,
    clearAllFiles,
  };
} 