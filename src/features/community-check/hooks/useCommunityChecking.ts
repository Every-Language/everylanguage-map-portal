import { useState, useCallback, useMemo } from 'react';
import { useMediaFilesByProject } from '@/shared/hooks/query/media-files';
import { useUpdateMediaFileCheckStatus, useBulkUpdateMediaFileCheckStatus } from '@/shared/hooks/query/verse-feedback';
import { useSelectedProject } from '@/features/dashboard/hooks/useSelectedProject';
import type { MediaFile } from '@/shared/hooks/query/media-files';
import type { CheckStatus } from '../types';

export function useCommunityChecking() {
  const { selectedProject } = useSelectedProject();
  const [selectedFileForChecking, setSelectedFileForChecking] = useState<MediaFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Fetch all media files for the project
  const { data: allMediaFiles, isLoading, error } = useMediaFilesByProject(
    selectedProject?.id || null
  );

  // Mutation for updating file check status
  const updateCheckStatusMutation = useUpdateMediaFileCheckStatus();
  // Bulk mutation for updating multiple files at once
  const bulkUpdateCheckStatusMutation = useBulkUpdateMediaFileCheckStatus();

  // Filter for files with pending check status  
  const pendingCheckFiles = useMemo(() => 
    allMediaFiles?.filter(
      file => file.check_status === 'pending' && file.upload_status === 'completed'
    ) || [], [allMediaFiles]
  );

  // Start checking a specific file
  const handleStartChecking = useCallback((file: MediaFile) => {
    setSelectedFileForChecking(file);
  }, []);

  // Stop checking and return to table view
  const handleStopChecking = useCallback(() => {
    setSelectedFileForChecking(null);
  }, []);

  // Publish a single file (approve it)
  const handlePublishFile = useCallback(async (fileId: string) => {
    try {
      await updateCheckStatusMutation.mutateAsync({
        mediaFileId: fileId,
        newStatus: 'approved'
      });
      
      // If we're currently checking this file, stop checking
      if (selectedFileForChecking?.id === fileId) {
        setSelectedFileForChecking(null);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error publishing file:', error);
      return { success: false, error };
    }
  }, [updateCheckStatusMutation, selectedFileForChecking]);

  // Update file check status
  const handleUpdateFileStatus = useCallback(async (fileId: string, newStatus: CheckStatus) => {
    try {
      await updateCheckStatusMutation.mutateAsync({
        mediaFileId: fileId,
        newStatus
      });

      // If we're currently checking this file and it's not pending anymore, stop checking
      if (selectedFileForChecking?.id === fileId && newStatus !== 'pending') {
        setSelectedFileForChecking(null);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating file status:', error);
      return { success: false, error };
    }
  }, [updateCheckStatusMutation, selectedFileForChecking]);

  // Bulk publish selected files
  const handleBulkPublish = useCallback(async () => {
    try {
      // OPTIMIZED: Single batch update instead of multiple individual updates
      await bulkUpdateCheckStatusMutation.mutateAsync({
        mediaFileIds: selectedFiles,
            newStatus: 'approved'
      });
      setSelectedFiles([]);
      return { success: true };
    } catch (error) {
      console.error('Error bulk publishing files:', error);
      return { success: false, error };
    }
  }, [selectedFiles, bulkUpdateCheckStatusMutation]);

  // Bulk update status for selected files
  const handleBulkUpdateStatus = useCallback(async (newStatus: CheckStatus) => {
    try {
      // OPTIMIZED: Single batch update instead of multiple individual updates
      await bulkUpdateCheckStatusMutation.mutateAsync({
        mediaFileIds: selectedFiles,
            newStatus
      });
      setSelectedFiles([]);
      return { success: true };
    } catch (error) {
      console.error('Error bulk updating file status:', error);
      return { success: false, error };
    }
  }, [selectedFiles, bulkUpdateCheckStatusMutation]);

  // Selection management
  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  }, []);

  const handleSelectAllFiles = useCallback(() => {
    setSelectedFiles(pendingCheckFiles.map(file => file.id));
  }, [pendingCheckFiles]);

  const handleClearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  return {
    // Data
    pendingCheckFiles,
    selectedFileForChecking,
    selectedFiles,
    
    // Loading states
    isLoading,
    error,
    isUpdating: updateCheckStatusMutation.isPending,
    
    // Actions
    handleStartChecking,
    handleStopChecking,
    handlePublishFile,
    handleUpdateFileStatus,
    handleBulkPublish,
    handleBulkUpdateStatus,
    
    // Selection management
    handleSelectFile,
    handleSelectAllFiles,
    handleClearSelection,
    
    // Computed values
    hasSelectedFiles: selectedFiles.length > 0,
    selectedFilesCount: selectedFiles.length,
    totalPendingFiles: pendingCheckFiles.length,
    isCheckingFile: !!selectedFileForChecking
  };
} 