import { useDataTableState, type DataTableFilters } from '../../../shared/hooks/useDataTableState';
import { useModalState } from '../../../shared/hooks/useModalState';
import { useBulkOperations } from '../../../shared/hooks/useBulkOperations';
import { useFormState } from '../../../shared/hooks/useFormState';
import {
  useMediaFilesByProject,
  useUpdateMediaFile,
  useBatchUpdateMediaFileStatus,
  useBatchUpdateMediaFilePublishStatus,
  useSoftDeleteMediaFiles,
  type MediaFileWithVerseInfo
} from '../../../shared/hooks/query/media-files';
import {
  useAudioVersionsByProject,
  useCreateAudioVersion
} from '../../../shared/hooks/query/audio-versions';
import { useBibleVersions } from '../../../shared/hooks/query/bible-versions';
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
import { useMemo, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Type definitions for the audio file management
export interface AudioFileFilters {
  audioVersionId: string;
  publishStatus: string;
  uploadStatus: string;
  searchText: string;
  bookId: string;
  chapterId: string;
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
type SortField = 'filename' | 'publish_status' | 'upload_status' | 'created_at' | 'verse_reference';

export function useAudioFileManagement(projectId: string | null) {
  // Core data table state management
  const tableState = useDataTableState({
    initialFilters: {
      audioVersionId: 'all',
      publishStatus: 'all',
      uploadStatus: 'all',
      searchText: '',
      bookId: 'all',
      chapterId: 'all'
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
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const { downloadState, downloadFile, clearError } = useDownload();
  const queryClient = useQueryClient();

  // Data fetching
  const { data: mediaFiles, isLoading: mediaFilesLoading, error, refetch } = useMediaFilesByProject(projectId);
  const { data: audioVersions, isLoading: audioVersionsLoading, refetch: refetchAudioVersions } = useAudioVersionsByProject(projectId || '');
  const { data: bibleVersions } = useBibleVersions();
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
  const createAudioVersionMutation = useCreateAudioVersion();

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

  // Filter and sort media files (global filtering for search)
  const filteredAndSortedFiles = useMemo(() => {
    if (!mediaFiles || !projectId) return { all: [], paginated: [], totalCount: 0 };
    
    const filtered = mediaFiles.filter((file: MediaFileWithVerseInfo) => {
      const matchesAudioVersion = tableState.filters.audioVersionId === 'all' || file.audio_version_id === tableState.filters.audioVersionId;
      const matchesPublishStatus = tableState.filters.publishStatus === 'all' || (file.publish_status || 'pending') === tableState.filters.publishStatus;
      const matchesUploadStatus = tableState.filters.uploadStatus === 'all' || (file.upload_status || 'pending') === tableState.filters.uploadStatus;
      const matchesBook = tableState.filters.bookId === 'all' || file.book_id === tableState.filters.bookId;
      const matchesChapter = tableState.filters.chapterId === 'all' || file.chapter_id === tableState.filters.chapterId;
      const searchText = tableState.filters.searchText as string;
      const matchesSearch = !searchText || 
        file.filename?.toLowerCase().includes(searchText.toLowerCase()) ||
        file.verse_reference?.toLowerCase().includes(searchText.toLowerCase());
        
      return matchesAudioVersion && matchesPublishStatus && matchesUploadStatus && matchesBook && matchesChapter && matchesSearch;
    });

    // Sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (tableState.sortField) {
        case 'filename': {
          comparison = (a.filename || '').localeCompare(b.filename || '');
          break;
        }
        case 'publish_status': {
          const statusA = a.publish_status || 'pending';
          const statusB = b.publish_status || 'pending';
          comparison = statusA.localeCompare(statusB);
          break;
        }
        case 'upload_status': {
          const statusA = a.upload_status || 'pending';
          const statusB = b.upload_status || 'pending';
          comparison = statusA.localeCompare(statusB);
          break;
        }
        case 'created_at': {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          comparison = dateA - dateB;
          break;
        }
        case 'verse_reference': {
          // Sort by global book order first, then chapter number, then start verse number
          const bookOrderA = a.book_global_order || 999;
          const bookOrderB = b.book_global_order || 999;
          
          if (bookOrderA !== bookOrderB) {
            comparison = bookOrderA - bookOrderB;
          } else {
            // Same book, sort by chapter number
            const chapterA = a.chapter_number || 0;
            const chapterB = b.chapter_number || 0;
            
            if (chapterA !== chapterB) {
              comparison = chapterA - chapterB;
            } else {
              // Same chapter, sort by start verse number
              const verseA = a.start_verse_number || 0;
              const verseB = b.start_verse_number || 0;
              comparison = verseA - verseB;
            }
          }
          break;
        }
        default:
          comparison = 0;
      }
      
      return tableState.sortDirection === 'desc' ? -comparison : comparison;
    });

    // Apply pagination to the sorted results
    const startIndex = (tableState.currentPage - 1) * tableState.itemsPerPage;
    const endIndex = startIndex + tableState.itemsPerPage;
    const paginated = sorted.slice(startIndex, endIndex);

    return {
      all: sorted,
      paginated: paginated,
      totalCount: sorted.length
    };
  }, [mediaFiles, projectId, tableState.filters, tableState.sortField, tableState.sortDirection, tableState.currentPage, tableState.itemsPerPage]);

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
    if (!projectId || !enhancedAudioVersionForm.validateForm() || !dbUser) {
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
        created_by: dbUser.id
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
  }, [projectId, enhancedAudioVersionForm, dbUser, toast, createAudioVersionMutation, modalState, refetchAudioVersions]);

  const handlePlay = useCallback(async (file: MediaFileWithVerseInfo) => {
    if (!file.remote_path) {
      console.error('No remote path available for file');
      return;
    }

    try {
      setLoadingAudioId(file.id);
      
      // Get presigned URL for streaming
      const downloadService = await import('../../../shared/services/downloadService');
      const service = new downloadService.DownloadService();
      const result = await service.getDownloadUrls([file.remote_path]);
      
      if (result.success && result.urls[file.remote_path]) {
        playFile(file, result.urls[file.remote_path]);
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

  const handleRowSelect = useCallback((id: string, checked: boolean) => {
    bulkOps.selectItem(id, checked);
  }, [bulkOps]);

  // Execute bulk operation handler
  const executeBulkOperation = useCallback(async (operationId: string) => {
    await bulkOps.performBulkOperation(operationId);
  }, [bulkOps]);

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

  // Helper function to safely extract filters as AudioFileFilters type
  const extractAudioFileFilters = (filters: DataTableFilters): AudioFileFilters => {
    return {
      audioVersionId: (filters.audioVersionId as string) || 'all',
      publishStatus: (filters.publishStatus as string) || 'all',
      uploadStatus: (filters.uploadStatus as string) || 'all',
      searchText: (filters.searchText as string) || '',
      bookId: (filters.bookId as string) || 'all',
      chapterId: (filters.chapterId as string) || 'all'
    };
  };

  // Computed properties for selection state
  const allCurrentPageSelected = filteredAndSortedFiles.paginated.length > 0 && 
    filteredAndSortedFiles.paginated.every(file => bulkOps.selectedItems.has(file.id));
  const someCurrentPageSelected = filteredAndSortedFiles.paginated.some(file => bulkOps.selectedItems.has(file.id));
  const selectedItems = Array.from(bulkOps.selectedItems);

  return {
    // State - safely extract filters as expected type for components
    filters: extractAudioFileFilters(tableState.filters),
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
    totalPages: Math.ceil(filteredAndSortedFiles.totalCount / tableState.itemsPerPage),
    
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
    createAudioVersionMutation
  };
} 