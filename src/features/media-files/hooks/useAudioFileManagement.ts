import { useDataTableState } from '../../../shared/hooks/useDataTableState';
import { useModalState } from '../../../shared/hooks/useModalState';
import { useBulkOperations } from '../../../shared/hooks/useBulkOperations';
import { useFormState } from '../../../shared/hooks/useFormState';
import {
  useMediaFilesByProjectPaginated,
  useUpdateMediaFile,
  useBatchUpdateMediaFileStatus,
  useBatchUpdateMediaFilePublishStatus,
  useSoftDeleteMediaFiles,
  useRestoreMediaFiles,
  type MediaFileWithVerseInfo
} from '../../../shared/hooks/query/media-files';
import {
  useAudioVersionsByProject,
  useCreateAudioVersion
} from '../../../shared/hooks/query/audio-versions';
import { useBibleVersions } from '../../../shared/stores/project';
import {
  useBooks,
  useChaptersByBook,
  useVersesByChapter
} from '../../../shared/hooks/query/bible-structure';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { useDownload } from '../../../shared/hooks/useDownload';
import { useAudioPlayerStore } from '../../../shared/stores/audioPlayer';
import { useSelectedProject } from '../../../features/dashboard/hooks/useSelectedProject';
import { useVerseMarking } from './useVerseMarking';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Type definitions for the audio file management
export interface AudioFileFilters {
  audioVersionId: string;
  publishStatus: string;
  uploadStatus: string;
  searchText: string;
  bookId: string;
  chapterId: string;
  showDeleted?: boolean;
}

export interface AudioFileEditForm extends Record<string, unknown> {
  bookId: string;
  chapterId: string;
  startVerseId: string;
  endVerseId: string;
  publishStatus: 'pending' | 'published' | 'archived';
}

export interface AudioVersionForm extends Record<string, unknown> {
  name: string;
  selectedBibleVersion: string;
}

type PublishStatus = 'pending' | 'published' | 'archived';
type SortField = 'created_at' | 'verse_reference';

export function useAudioFileManagement(projectId: string | null) {
  // Core data table state management
  const tableState = useDataTableState({
    initialFilters: {
      audioVersionId: 'all',
      publishStatus: 'all',
      uploadStatus: 'all',
      searchText: '',
      bookId: 'all',
      chapterId: 'all',
      showDeleted: false
    },
    initialSort: {
      field: 'created_at',
      direction: 'desc'
    },
    initialPage: 1,
    initialItemsPerPage: 25
  });

  // Modal state management
  const modalState = useModalState();

  // Audio player state
  const { playFile } = useAudioPlayerStore();
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);

  // Project context
  const { selectedProject } = useSelectedProject();

  // Verse marking functionality
  const verseMarking = useVerseMarking();

  // Form state for editing audio files
  const editForm = useFormState<AudioFileEditForm>({
    initialData: {
      bookId: '',
      chapterId: '',
      startVerseId: '',
      endVerseId: '',
      publishStatus: 'pending'
    },
    validationRules: [
      { field: 'startVerseId', required: true },
      { field: 'publishStatus', required: true }
    ]
  });

  // Form state for creating audio versions
  const audioVersionForm = useFormState<AudioVersionForm>({
    initialData: {
      name: '',
      selectedBibleVersion: ''
    },
    validationRules: [
      { field: 'name', required: true, minLength: 1 },
      { field: 'selectedBibleVersion', required: true }
    ]
  });

  // External dependencies
  const { user } = useAuth();
  const { toast } = useToast();
  const { downloadState, downloadFile, clearError } = useDownload();
  const queryClient = useQueryClient();

  // Data fetching using paginated hook for better performance
  const { 
    data: paginatedResult, 
    isLoading: mediaFilesLoading, 
    refetch 
  } = useMediaFilesByProjectPaginated(projectId || '', {
    page: tableState.currentPage,
    pageSize: tableState.itemsPerPage,
    audioVersionId: tableState.filters.audioVersionId as string,
    bookId: tableState.filters.bookId as string,
    chapterId: tableState.filters.chapterId as string,
    publishStatus: tableState.filters.publishStatus as string,
    uploadStatus: tableState.filters.uploadStatus as string,
    searchText: tableState.filters.searchText as string,
    sortField: tableState.sortField,
    sortDirection: tableState.sortDirection,
    showDeleted: tableState.filters.showDeleted as boolean
  });
  
  // Extract data and count from paginated result
  const mediaFiles = paginatedResult?.data || [];
  const totalItems = paginatedResult?.count || 0;
  const totalPages = Math.ceil(totalItems / tableState.itemsPerPage);
  
  const { data: audioVersions, isLoading: audioVersionsLoading, refetch: refetchAudioVersions } = useAudioVersionsByProject(projectId || '');
  // Data fetching for bible versions - use store data directly  
  const bibleVersions = useBibleVersions(); // This is now an array directly

  // Auto-select first audio version if none selected and "all" is currently selected
  useEffect(() => {
    if (audioVersions && audioVersions.length > 0 && tableState.filters.audioVersionId === 'all') {
      tableState.handleFilterChange('audioVersionId', audioVersions[0].id);
    }
  }, [audioVersions, tableState.filters.audioVersionId, tableState]);

  // Error handling - combine errors from all queries
  const error = null; // For now, we'll handle errors through the individual mutations
  const { data: books, isLoading: booksLoading } = useBooks();
  
  // Fetch chapters for both filter display and edit modal
  const filterBookId = tableState.filters.bookId !== 'all' ? tableState.filters.bookId as string : null;
  const editFormBookId = editForm.data.bookId || null;
  const { data: filterChapters, isLoading: filterChaptersLoading } = useChaptersByBook(filterBookId);
  const { data: editChapters, isLoading: editChaptersLoading } = useChaptersByBook(editFormBookId);
  
  // Combine chapters from both filter and edit contexts, prioritizing edit chapters when available
  const chapters = editFormBookId ? editChapters : filterChapters;
  const chaptersLoading = editFormBookId ? editChaptersLoading : filterChaptersLoading;
  
  const { data: chapterVerses } = useVersesByChapter(editForm.data.chapterId || null);

  // Mutations
  const updateMediaFile = useUpdateMediaFile();
  const batchUpdateStatus = useBatchUpdateMediaFileStatus();
  const batchUpdatePublishStatus = useBatchUpdateMediaFilePublishStatus();
  const softDeleteFiles = useSoftDeleteMediaFiles();
  const restoreFiles = useRestoreMediaFiles();
  const createAudioVersionMutation = useCreateAudioVersion();

  // Modal state for confirmations
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'restore';
    items: string[];
    message: string;
  }>({
    isOpen: false,
    type: 'delete',
    items: [],
    message: ''
  });

  // Enhanced form state for edit modal with the updateField method expected by components
  const enhancedEditForm = useMemo(() => ({
    ...editForm,
    updateField: (field: string, value: string) => {
      editForm.setFieldValue(field as keyof AudioFileEditForm, value);
    }
  }), [editForm]);

  // Enhanced form state for audio version creation
  const enhancedAudioVersionForm = useMemo(() => ({
    ...audioVersionForm,
    updateField: (field: string, value: string) => {
      audioVersionForm.setFieldValue(field as keyof AudioVersionForm, value);
    }
  }), [audioVersionForm]);

  // Data is already filtered, sorted, and paginated on the server side
  const filteredAndSortedFiles = {
    all: mediaFiles, // For bulk operations that need to reference all items
    paginated: mediaFiles, // Current page data
    totalCount: totalItems // Total count from server
  };

  // Bulk operations setup
  const bulkOps = useBulkOperations(filteredAndSortedFiles.paginated, {
    getId: (file) => file.id,
    operations: [
      {
        id: 'pending',
        label: 'Set to Pending',
        handler: async (selectedIds: string[]) => {
          await batchUpdatePublishStatus.mutateAsync({
            fileIds: selectedIds,
            status: 'pending'
          });
        }
      },
      {
        id: 'published',
        label: 'Set to Published',
        handler: async (selectedIds: string[]) => {
          await batchUpdatePublishStatus.mutateAsync({
            fileIds: selectedIds,
            status: 'published'
          });
        }
      },
      {
        id: 'archived',
        label: 'Set to Archived',
        handler: async (selectedIds: string[]) => {
          await batchUpdatePublishStatus.mutateAsync({
            fileIds: selectedIds,
            status: 'archived'
          });
        }
      },
      {
        id: 'soft_delete',
        label: 'Soft Delete',
        handler: async (selectedIds: string[]) => {
          await softDeleteFiles.mutateAsync({ fileIds: selectedIds });
        }
      },
      {
        id: 'restore',
        label: 'Restore',
        handler: async (selectedIds: string[]) => {
          await restoreFiles.mutateAsync({ fileIds: selectedIds });
        }
      }
    ]
  });

  // Action handlers
  const handleEditClick = useCallback((file: MediaFileWithVerseInfo) => {
    enhancedEditForm.setFormData({
      bookId: file.book_id || '',
      chapterId: file.chapter_id || '',
      startVerseId: file.start_verse_id || '',
      endVerseId: file.end_verse_id || '',
      publishStatus: file.publish_status || 'pending'
    });
    modalState.openModal('edit', { currentMediaFile: file });
  }, [enhancedEditForm, modalState]);

  const handleSaveEdit = useCallback(async () => {
    if (!enhancedEditForm.validateForm()) return;

    const currentMediaFile = modalState.modalData?.currentMediaFile as MediaFileWithVerseInfo;
    if (!currentMediaFile) return;

    try {
      await updateMediaFile.mutateAsync({
        id: currentMediaFile.id,
        updates: {
          start_verse_id: enhancedEditForm.data.startVerseId || null,
          end_verse_id: enhancedEditForm.data.endVerseId || null,
          publish_status: enhancedEditForm.data.publishStatus
        }
      });
      modalState.closeModal();
      enhancedEditForm.resetForm();
      refetch();
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  }, [enhancedEditForm, updateMediaFile, modalState, refetch]);

  const handlePublishStatusChange = useCallback(async (fileId: string, newStatus: PublishStatus) => {
    try {
      await updateMediaFile.mutateAsync({
        id: fileId,
        updates: { publish_status: newStatus }
      });
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  }, [updateMediaFile]);

  const handleCreateAudioVersion = useCallback(async () => {
    if (!projectId || !enhancedAudioVersionForm.validateForm() || !user) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'error'
      });
      return;
    }

    try {
      if (!selectedProject?.target_language_entity_id) {
        toast({
          title: 'Project configuration error',
          description: 'Project does not have a target language configured',
          variant: 'error'
        });
        return;
      }

      await createAudioVersionMutation.mutateAsync({
        name: enhancedAudioVersionForm.data.name.trim(),
        language_entity_id: selectedProject.target_language_entity_id,
        bible_version_id: enhancedAudioVersionForm.data.selectedBibleVersion,
        project_id: projectId,
        created_by: user.id
      });

      toast({
        title: 'Audio version created',
        description: `Successfully created audio version "${enhancedAudioVersionForm.data.name}"`,
        variant: 'success'
      });

      enhancedAudioVersionForm.resetForm();
      modalState.closeModal();
      await refetchAudioVersions();
    } catch (error: unknown) {
      console.error('Error creating audio version:', error);
      toast({
        title: 'Failed to create audio version',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error'
      });
    }
  }, [projectId, enhancedAudioVersionForm, user, toast, createAudioVersionMutation, modalState, refetchAudioVersions, selectedProject?.target_language_entity_id]);

  const handlePlay = useCallback(async (file: MediaFileWithVerseInfo) => {
    if (!file.id) {
      console.error('No media file id available for file');
      return;
    }

    try {
      setLoadingAudioId(file.id);
      
      // Get presigned URL for streaming by media file ID
      const downloadService = await import('../../../shared/services/downloadService');
      const service = new downloadService.DownloadService();
      const result = await service.getDownloadUrlsById({ mediaFileIds: [file.id] });
      const signedUrl = result.media?.[file.id];
      
      if (result.success && signedUrl) {
        // Convert the file to the audio player's expected type
        const audioFile = {
          ...file,
          check_status: file.check_status || 'pending'
        } as import('../../../shared/stores/audioPlayer').MediaFileWithVerseInfo;
        playFile(audioFile, signedUrl);
      } else {
        console.error('Failed to get streaming URL');
      }
    } catch (error) {
      console.error('Error getting audio URL:', error);
    } finally {
      setLoadingAudioId(null);
    }
  }, [playFile, setLoadingAudioId]);

  const handleVerseMarking = useCallback((file: MediaFileWithVerseInfo) => {
    verseMarking.openModal(file);
  }, [verseMarking]);

  const handleDownload = useCallback(async (file: MediaFileWithVerseInfo) => {
    await downloadFile(file);
  }, [downloadFile]);

  const handleUploadComplete = useCallback(() => {
    console.log('🔄 Audio upload completed - refreshing table data');
    
    // Force comprehensive query invalidation and refetch immediately
    if (selectedProject?.id) {
      console.log('📋 Invalidating all media file queries for project:', selectedProject.id);
      
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: ['media_files_with_verse_info', selectedProject.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['media_files', selectedProject.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['media_files']
      });
      
      // Force immediate refetch to show updates
      queryClient.refetchQueries({
        queryKey: ['media_files_with_verse_info', selectedProject.id]
      });
      
      // Also trigger a local refetch as backup
      refetch();
    } else {
      // Fallback if no project ID
      refetch();
    }
  }, [refetch, selectedProject?.id, queryClient]);

  // Selection handlers that match component expectations
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      bulkOps.selectAll(filteredAndSortedFiles.paginated);
    } else {
      bulkOps.clearSelection();
    }
  }, [filteredAndSortedFiles.paginated, bulkOps]);

  const handleRowSelect = useCallback((id: string, checked?: boolean) => {
    bulkOps.selectItem(id, checked ?? false);
  }, [bulkOps]);

  // Bulk operations handler
  const executeBulkOperation = useCallback(async (action: string) => {
    const selectedIds = Array.from(bulkOps.selectedItems);
    if (selectedIds.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select items to perform bulk operations',
        variant: 'warning'
      });
      return;
    }

    try {
      switch (action) {
        case 'pending':
        case 'published':
        case 'archived':
          await batchUpdatePublishStatus.mutateAsync({
            fileIds: selectedIds,
            status: action as 'pending' | 'published' | 'archived'
          });
          toast({
            title: 'Status updated',
            description: `${selectedIds.length} files updated to ${action}`,
            variant: 'success'
          });
          bulkOps.clearSelection();
          break;
        case 'soft_delete':
          setConfirmationModal({
            isOpen: true,
            type: 'delete',
            items: selectedIds,
            message: `Are you sure you want to delete ${selectedIds.length} selected file${selectedIds.length !== 1 ? 's' : ''}? This action can be undone by restoring the files later.`
          });
          break;
        case 'restore':
          setConfirmationModal({
            isOpen: true,
            type: 'restore',
            items: selectedIds,
            message: `Are you sure you want to restore ${selectedIds.length} selected file${selectedIds.length !== 1 ? 's' : ''}?`
          });
          break;
        default:
          console.warn('Unknown bulk operation:', action);
      }
    } catch (error) {
      console.error('Error in bulk operation:', error);
      toast({
        title: 'Operation failed',
        description: `Failed to ${action} selected files`,
        variant: 'error'
      });
    }
  }, [bulkOps, batchUpdatePublishStatus, toast, setConfirmationModal]);

  // Bulk operations
  const handleBulkPublishStatusChange = useCallback(async (status: PublishStatus) => {
    if (bulkOps.selectedItems.size === 0) return;
    
    try {
      await batchUpdatePublishStatus.mutateAsync({
        fileIds: Array.from(bulkOps.selectedItems),
        status
      });
      bulkOps.clearSelection();
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  }, [bulkOps, batchUpdatePublishStatus]);

  const handleBulkDownload = useCallback(async () => {
    if (bulkOps.selectedItems.size === 0) return;
    
    const filesToDownload = filteredAndSortedFiles.all.filter(file => 
      bulkOps.selectedItems.has(file.id)
    );
    
    // Download files one by one
    for (const file of filesToDownload) {
      try {
        await downloadFile(file);
      } catch (error) {
        console.error(`Failed to download ${file.filename}:`, error);
      }
    }
  }, [bulkOps, filteredAndSortedFiles.all, downloadFile]);



  // Form change handler for edit modal
  const handleEditFormChange = useCallback((field: string, value: string) => {
    enhancedEditForm.setFieldValue(field as keyof AudioFileEditForm, value);
    
    // Reset dependent fields when parent changes
    if (field === 'bookId') {
      enhancedEditForm.setFieldValue('chapterId', '');
      enhancedEditForm.setFieldValue('startVerseId', '');
      enhancedEditForm.setFieldValue('endVerseId', '');
    } else if (field === 'chapterId') {
      enhancedEditForm.setFieldValue('startVerseId', '');
      enhancedEditForm.setFieldValue('endVerseId', '');
    }
  }, [enhancedEditForm]);

  // Computed properties for selection state
  const allCurrentPageSelected = filteredAndSortedFiles.paginated.length > 0 && 
    filteredAndSortedFiles.paginated.every(file => bulkOps.selectedItems.has(file.id));
  const someCurrentPageSelected = filteredAndSortedFiles.paginated.some(file => bulkOps.selectedItems.has(file.id));
  const selectedItems = Array.from(bulkOps.selectedItems);

  // Delete handler for individual files - now with confirmation
  const handleDelete = useCallback(async (file: MediaFileWithVerseInfo) => {
    setConfirmationModal({
      isOpen: true,
      type: 'delete',
      items: [file.id],
      message: `Are you sure you want to delete "${file.filename}"? This action can be undone by restoring the file later.`
    });
  }, []);

  // Confirmation modal handlers
  const handleConfirmAction = useCallback(async () => {
    try {
      const { type, items } = confirmationModal;
      
      if (type === 'delete') {
        await softDeleteFiles.mutateAsync({
          fileIds: items
        });
        toast({
          title: 'Files deleted',
          description: `${items.length} file${items.length !== 1 ? 's' : ''} deleted successfully`,
          variant: 'success'
        });
      } else if (type === 'restore') {
        await restoreFiles.mutateAsync({
          fileIds: items
        });
        toast({
          title: 'Files restored',
          description: `${items.length} file${items.length !== 1 ? 's' : ''} restored successfully`,
          variant: 'success'
        });
      }
      
      // Clear selection after successful operation
      bulkOps.clearSelection();
      setConfirmationModal({ isOpen: false, type: 'delete', items: [], message: '' });
    } catch (error) {
      console.error('Error in confirmation action:', error);
      toast({
        title: 'Operation failed',
        description: `Failed to ${confirmationModal.type} selected files`,
        variant: 'error'
      });
    }
  }, [confirmationModal, softDeleteFiles, restoreFiles, toast, bulkOps]);

  const handleCancelConfirmation = useCallback(() => {
    setConfirmationModal({ isOpen: false, type: 'delete', items: [], message: '' });
  }, []);

  return {
    // State - safely extract filters as expected type for components
    filters: {
      ...tableState.filters,
      showDeleted: tableState.filters.showDeleted || false
    } as AudioFileFilters & { showDeleted: boolean },
    sortField: tableState.sortField as SortField | null,
    sortDirection: tableState.sortDirection,
    ...modalState,
    editForm: enhancedEditForm,
    audioVersionForm: enhancedAudioVersionForm,
    
    // Data
    mediaFiles: filteredAndSortedFiles.paginated,
    audioVersions: audioVersions || [],
    bibleVersions: bibleVersions || [],
    books: books || [],
    chapters: chapters || [],
    chapterVerses: chapterVerses || [],
    
    // Pagination data
    currentPage: tableState.currentPage,
    itemsPerPage: tableState.itemsPerPage,
    totalItems: filteredAndSortedFiles.totalCount,
    totalPages,
    
    // Loading states
    isLoading: mediaFilesLoading || audioVersionsLoading || booksLoading || chaptersLoading,
    error,
    
    // Download state
    downloadState,
    clearDownloadError: clearError,
    
    // Audio loading state
    loadingAudioId,
    
    // Verse marking state
    verseMarking,
    
    // Selection state that matches component expectations
    selectedItems,
    allCurrentPageSelected,
    someCurrentPageSelected,
    
    // Actions that match component expectations
    handleFilterChange: tableState.handleFilterChange,
    handleSort: tableState.handleSort,
    handleSelectAll,
    handleRowSelect,
    handleEditClick,
    handleSaveEdit,
    handleEditFormChange,
    handlePublishStatusChange,
    handleCreateAudioVersion,
    handlePlay,
    handleDownload,
    handleVerseMarking,
    handleUploadComplete,
    executeBulkOperation,
    handleBulkPublishStatusChange,
    handleBulkDownload,
    clearSelection: bulkOps.clearSelection,
    refetch,
    refetchAudioVersions,
    
    // Pagination actions
    handlePageChange: tableState.handlePageChange,
    handlePageSizeChange: tableState.handlePageSizeChange,
    
    // Mutations
    updateMediaFile,
    batchUpdateStatus,
    batchUpdatePublishStatus,
    softDeleteFiles,
    restoreFiles,
    createAudioVersionMutation,
    handleDelete,
    handleConfirmAction,
    handleCancelConfirmation,
    
    // Confirmation modal
    confirmationModal
  };
} 