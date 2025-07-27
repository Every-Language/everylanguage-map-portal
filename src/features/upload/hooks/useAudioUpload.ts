import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { type ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';
import { createBulkUploadFiles, type BulkUploadResponse } from '../../../shared/services/bulkUploadService';
import { useUploadStore } from '../../../shared/stores/upload';
import { useOptimisticMediaFileUpdates } from '../../../shared/hooks/query/media-files';
import { supabase } from '../../../shared/services/supabase';

export function useAudioUpload() {
  const [audioFiles, setAudioFiles] = useState<ProcessedAudioFile[]>([]);
  const [selectedAudioVersionId, setSelectedAudioVersionId] = useState<string>('');
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { selectedProject } = useSelectedProject();
  const queryClient = useQueryClient();
  const { addOptimisticUploads, removeOptimisticUploads } = useOptimisticMediaFileUpdates();
  
  // Use the global upload store
  const { 
    startBulkUpload, 
    isUploading, 
    uploadProgress,
    setShowProgress
  } = useUploadStore();

  // Handle upload completion with proper cache invalidation
  const handleUploadComplete = useCallback((response: BulkUploadResponse) => {
    if (response.success && response.data) {
      const completedFiles = response.data.mediaRecords.filter(r => r.status === 'completed').length;
      const failedFiles = response.data.mediaRecords.filter(r => r.status === 'failed').length;
      
      if (failedFiles > 0) {
        toast({
          title: 'Upload completed with errors',
          description: `${completedFiles} files uploaded successfully, ${failedFiles} failed.`,
          variant: 'warning'
        });
      } else {
        toast({
          title: 'Upload completed',
          description: `Successfully uploaded all ${completedFiles} files.`,
          variant: 'success'
        });
      }

      // Remove optimistic uploads since real data should be coming in
      if (selectedProject?.id) {
        removeOptimisticUploads(selectedProject.id);
      }

      // Comprehensive cache invalidation to refresh the table
      if (selectedProject?.id) {
        // Invalidate all media file related queries
        queryClient.invalidateQueries({
          queryKey: ['media_files_with_verse_info', selectedProject.id]
        });
        queryClient.invalidateQueries({
          queryKey: ['media_files', selectedProject.id]
        });
        queryClient.invalidateQueries({
          queryKey: ['media_files']
        });
        
        // Also refetch the queries to trigger immediate update
        queryClient.refetchQueries({
          queryKey: ['media_files_with_verse_info', selectedProject.id]
        });
      }
    }
  }, [toast, queryClient, selectedProject?.id, removeOptimisticUploads]);

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
        description: 'Please ensure all files have book, chapter, and verse selections.',
        variant: 'warning'
      });
      return;
    }

    if (!selectedAudioVersionId) {
      toast({
        title: 'Audio version required',
        description: 'Please select an audio version for the upload.',
        variant: 'warning'
      });
      return;
    }

    if (!selectedProject?.target_language_entity_id) {
      console.error('❌ Project target language entity ID is missing');
      toast({
        title: 'Project not configured',
        description: 'Project target language is not configured.',
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

      // Create bulk upload files
      const bulkUploadFiles = createBulkUploadFiles(
        validFiles,
        selectedProject.target_language_entity_id,
        selectedAudioVersionId
      );

      // Add optimistic uploads to show immediate feedback
      if (selectedProject?.id) {
        const optimisticUploads = validFiles.map(file => ({
          fileName: file.file.name,
          bookName: file.filenameParseResult.detectedBook || 'Unknown',
          chapterNumber: file.filenameParseResult.detectedChapter || 0,
          startVerseNumber: file.filenameParseResult.detectedStartVerse || 0,
          endVerseNumber: file.filenameParseResult.detectedEndVerse || file.filenameParseResult.detectedStartVerse || 0,
        }));
        
        console.log('🔄 Adding optimistic uploads to table:', optimisticUploads);
        addOptimisticUploads(selectedProject.id, optimisticUploads);
      }

      toast({
        title: 'Upload started',
        description: `Starting upload of ${validFiles.length} files. Progress will be tracked above.`,
        variant: 'success'
      });

      // Make sure progress display is visible immediately
      setShowProgress(true);

      // Start bulk upload using the global store
      const result = await startBulkUpload(bulkUploadFiles, session.access_token);
      
      // Schedule multiple refresh attempts to catch the database changes
      // Immediate refresh (might be too early)
      console.log('🔄 Triggering immediate table refresh after upload start');
      if (selectedProject?.id) {
        queryClient.invalidateQueries({
          queryKey: ['media_files_with_verse_info', selectedProject.id]
        });
      }
      
      // Delayed refresh to catch database inserts
      setTimeout(() => {
        console.log('🔄 Triggering delayed table refresh (500ms)');
        if (selectedProject?.id) {
          queryClient.invalidateQueries({
            queryKey: ['media_files_with_verse_info', selectedProject.id]
          });
          queryClient.refetchQueries({
            queryKey: ['media_files_with_verse_info', selectedProject.id]
          });
        }
      }, 500);
      
      // Another delayed refresh to ensure we catch any timing issues
      setTimeout(() => {
        console.log('🔄 Triggering second delayed table refresh (1500ms)');
        if (selectedProject?.id) {
          queryClient.invalidateQueries({
            queryKey: ['media_files_with_verse_info', selectedProject.id]
          });
          queryClient.refetchQueries({
            queryKey: ['media_files_with_verse_info', selectedProject.id]
          });
        }
      }, 1500);
      
      // Handle the completion
      handleUploadComplete(result);
      
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
  }, [audioFiles, selectedAudioVersionId, selectedProject, toast, handleUploadComplete, startBulkUpload, setShowProgress, queryClient, addOptimisticUploads, removeOptimisticUploads]);

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