import { useDataTableState, type DataTableFilters } from '../../../shared/hooks/useDataTableState';
import { useModalState } from '../../../shared/hooks/useModalState';
import { useBulkOperations } from '../../../shared/hooks/useBulkOperations';
import { useFormState } from '../../../shared/hooks/useFormState';
import {
  useTextVersionsByProject,
  useVerseTextsByProjectPaginated,
  useUpdateVerseTextPublishStatus,
  useEditVerseText,
  useCreateTextVersion,
  useSoftDeleteVerseTexts,
  useRestoreVerseTexts,
  type VerseTextWithRelations
} from '../../../shared/hooks/query/text-versions';
import { useBooks, useChapters, useVersesByChapter } from '../../../shared/hooks/query/bible-structure';
import { useBibleVersions } from '../../../shared/hooks/query/bible-versions';
import { useAuth } from '../../auth/hooks/useAuth';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { useMemo, useCallback, useState, useEffect } from 'react';
import type { TextVersionForm } from '../components/BibleTextManager/TextVersionModal';

// Type definitions for the bible text management
export interface BibleTextFilters {
  textVersionId: string;
  publishStatus: string;
  searchText: string;
  bookId: string;
  chapterId: string;
  showDeleted?: boolean;
}

export interface BibleTextSort {
  field: 'book_name' | 'chapter_number' | 'verse_number' | 'verse_text' | 'text_version_name' | 'publish_status' | 'created_at';
  direction: 'asc' | 'desc';
}

export interface BibleTextEditForm extends Record<string, unknown> {
  bookId: string;
  chapterId: string;
  verseId: string;
  verseNumber: string;
  verseText: string;
  textVersionId: string;
  publishStatus: 'pending' | 'published' | 'archived';
}

export function useBibleTextManagement(projectId: string | null) {
  // Core data table state management
  const tableState = useDataTableState({
    initialFilters: {
      textVersionId: 'all',
      bookId: 'all',
      chapterId: 'all',
      publishStatus: 'all',
      searchText: '',
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

  // Form state for editing
  const editForm = useFormState<BibleTextEditForm>({
    initialData: {
      bookId: '',
      chapterId: '',
      verseId: '',
      verseNumber: '',
      verseText: '',
      textVersionId: '',
      publishStatus: 'pending'
    },
    validationRules: [
      { field: 'verseText', required: true, minLength: 1 },
      { field: 'textVersionId', required: true },
      { field: 'verseId', required: true }
    ]
  });

  // Form state for creating text versions
  const textVersionForm = useFormState<TextVersionForm>({
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
  const { selectedProject } = useSelectedProject();
  const { toast } = useToast();

  // Data fetching using paginated hook
  const { 
    data: paginatedResult, 
    isLoading: verseTextsLoading, 
    refetch 
  } = useVerseTextsByProjectPaginated(projectId || '', {
    page: tableState.currentPage,
    pageSize: tableState.itemsPerPage,
    textVersionId: tableState.filters.textVersionId as string,
    bookId: tableState.filters.bookId as string,
    chapterId: tableState.filters.chapterId as string,
    publishStatus: tableState.filters.publishStatus as string,
    searchText: tableState.filters.searchText as string,
    sortField: tableState.sortField,
    sortDirection: tableState.sortDirection,
    showDeleted: tableState.filters.showDeleted as boolean
  });
  
  // Extract data and count from paginated result
  const verseTexts = paginatedResult?.data || [];
  const totalItems = paginatedResult?.count || 0;
  const totalPages = Math.ceil(totalItems / tableState.itemsPerPage);
  const { data: textVersions, isLoading: textVersionsLoading, refetch: refetchTextVersions } = useTextVersionsByProject(projectId || '');
  const { data: bibleVersions } = useBibleVersions();
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: allChapters, isLoading: chaptersLoading } = useChapters();
  const { data: chapterVerses } = useVersesByChapter(editForm.data.chapterId || null);

  // Filter chapters by selected book
  const chapters = useMemo(() => {
    if (!allChapters) return [];
    
    const selectedBookId = tableState.filters.bookId as string;
    if (!selectedBookId || selectedBookId === 'all') {
      return []; // Don't show any chapters until a book is selected
    }
    
    return allChapters.filter(chapter => chapter.book_id === selectedBookId);
  }, [allChapters, tableState.filters.bookId]);

  // Auto-select first text version if none selected and "all" is currently selected
  useEffect(() => {
    if (textVersions && textVersions.length > 0 && tableState.filters.textVersionId === 'all') {
      tableState.handleFilterChange('textVersionId', textVersions[0].id);
    }
  }, [textVersions, tableState.filters.textVersionId, tableState]);

  // Clear chapter selection when book changes
  useEffect(() => {
    const selectedBookId = tableState.filters.bookId as string;
    const selectedChapterId = tableState.filters.chapterId as string;
    
    if (selectedChapterId && selectedChapterId !== 'all' && selectedBookId && selectedBookId !== 'all') {
      // Check if the selected chapter belongs to the selected book
      const chapterBelongsToBook = allChapters?.some(
        chapter => chapter.id === selectedChapterId && chapter.book_id === selectedBookId
      );
      
      if (!chapterBelongsToBook) {
        // Clear chapter selection if it doesn't belong to the selected book
        tableState.handleFilterChange('chapterId', 'all');
      }
    }
  }, [tableState.filters.bookId, tableState.filters.chapterId, allChapters, tableState]);

  // Mutations
  const updatePublishStatusMutation = useUpdateVerseTextPublishStatus();
  const editVerseTextMutation = useEditVerseText();
  const createTextVersionMutation = useCreateTextVersion();
  const softDeleteVerseTextsMutation = useSoftDeleteVerseTexts();
  const restoreVerseTextsMutation = useRestoreVerseTexts();

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

  // Toast notifications are available from useToast hook imported above

  // Data is already filtered, sorted, and paginated on the server side
  const filteredAndSortedTexts = verseTexts;

  // Bulk operations setup
  const bulkOps = useBulkOperations(filteredAndSortedTexts, {
    operations: [
      {
        id: 'pending',
        label: 'Set to Pending',
        handler: async (selectedIds: string[]) => {
          await updatePublishStatusMutation.mutateAsync({
            verseTextIds: selectedIds,
            publishStatus: 'pending'
          });
        }
      },
      {
        id: 'published',
        label: 'Set to Published', 
        handler: async (selectedIds: string[]) => {
          await updatePublishStatusMutation.mutateAsync({
            verseTextIds: selectedIds,
            publishStatus: 'published'
          });
        }
      },
      {
        id: 'archived',
        label: 'Set to Archived',
        handler: async (selectedIds: string[]) => {
          await updatePublishStatusMutation.mutateAsync({
            verseTextIds: selectedIds,
            publishStatus: 'archived'
          });
        }
      },
      {
        id: 'soft_delete',
        label: 'Soft Delete',
        handler: async (selectedIds: string[]) => {
          await softDeleteVerseTextsMutation.mutateAsync({
            verseTextIds: selectedIds
          });
        }
      },
      {
        id: 'restore',
        label: 'Restore',
        handler: async (selectedIds: string[]) => {
          await restoreVerseTextsMutation.mutateAsync({
            verseTextIds: selectedIds
          });
        }
      }
    ]
  });

  // Enhanced form state for edit modal with the updateField method expected by components
  const enhancedEditForm = useMemo(() => ({
    ...editForm,
    updateField: (field: string, value: string) => {
      editForm.setFieldValue(field as keyof BibleTextEditForm, value);
    }
  }), [editForm]);

  // Action handlers
  const handleEditClick = useCallback((text: VerseTextWithRelations) => {
    enhancedEditForm.setFormData({
      bookId: text.verses?.chapters?.books?.id || '',
      chapterId: text.verses?.chapters?.id || '',
      verseId: text.verses?.id || '',
      verseNumber: text.verses?.verse_number?.toString() || '',
      verseText: text.verse_text || '',
      textVersionId: text.text_version_id || '',
      publishStatus: text.publish_status || 'pending'
    });
    modalState.openModal('edit', { currentText: text });
  }, [enhancedEditForm, modalState]);

  // Delete handler for individual verse texts - now with confirmation
  const handleDelete = useCallback(async (verseTextId: string) => {
    const verseText = verseTexts?.find(text => text.id === verseTextId);
    const verseReference = verseText ? 
      `${verseText.verses?.chapters?.books?.name} ${verseText.verses?.chapters?.chapter_number}:${verseText.verses?.verse_number}` : 
      'this verse text';
      
    setConfirmationModal({
      isOpen: true,
      type: 'delete',
      items: [verseTextId],
      message: `Are you sure you want to delete the text for ${verseReference}? This action can be undone by restoring the text later.`
    });
  }, [verseTexts]);

  // Confirmation modal handlers
  const handleConfirmAction = useCallback(async () => {
    try {
      const { type, items } = confirmationModal;
      
      if (type === 'delete') {
        await softDeleteVerseTextsMutation.mutateAsync({
          verseTextIds: items
        });
        toast({
          title: 'Texts deleted',
          description: `${items.length} text${items.length !== 1 ? 's' : ''} deleted successfully`,
          variant: 'success'
        });
      } else if (type === 'restore') {
        await restoreVerseTextsMutation.mutateAsync({
          verseTextIds: items
        });
        toast({
          title: 'Texts restored',
          description: `${items.length} text${items.length !== 1 ? 's' : ''} restored successfully`,
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
        description: `Failed to ${confirmationModal.type} selected texts`,
        variant: 'error'
      });
    }
  }, [confirmationModal, softDeleteVerseTextsMutation, restoreVerseTextsMutation, toast, bulkOps]);

  const handleCancelConfirmation = useCallback(() => {
    setConfirmationModal({ isOpen: false, type: 'delete', items: [], message: '' });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!enhancedEditForm.validateForm()) return;

    const currentVerseText = modalState.modalData?.currentVerseText as VerseTextWithRelations;
    if (!currentVerseText) return;

    try {
      await editVerseTextMutation.mutateAsync({
        id: currentVerseText.id,
        verseId: enhancedEditForm.data.verseId,
        verseText: enhancedEditForm.data.verseText,
        textVersionId: enhancedEditForm.data.textVersionId
      });
      modalState.closeModal();
      enhancedEditForm.resetForm();
    } catch (error) {
      console.error('Error saving verse text:', error);
    }
  }, [enhancedEditForm, editVerseTextMutation, modalState]);

  const handlePublishStatusChange = async (verseTextId: string, newStatus: 'pending' | 'published' | 'archived') => {
    try {
      await updatePublishStatusMutation.mutateAsync({
        verseTextIds: [verseTextId],
        publishStatus: newStatus
      });
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  };

  const handleUploadComplete = () => {
    refetch();
  };

  // Selection handlers that match component expectations
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      // Only select items on the current page
      bulkOps.selectAll(filteredAndSortedTexts);
    } else {
      // Deselect items on the current page
      const currentPageIds = filteredAndSortedTexts.map((text: VerseTextWithRelations) => text.id);
      currentPageIds.forEach((id: string) => bulkOps.selectItem(id, false));
    }
  }, [filteredAndSortedTexts, bulkOps]);

  const handleRowSelect = useCallback((id: string, checked: boolean) => {
    bulkOps.selectItem(id, checked);
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
          await updatePublishStatusMutation.mutateAsync({
            verseTextIds: selectedIds,
            publishStatus: action as 'pending' | 'published' | 'archived'
          });
          toast({
            title: 'Status updated',
            description: `${selectedIds.length} texts updated to ${action}`,
            variant: 'success'
          });
          bulkOps.clearSelection();
          break;
        case 'soft_delete':
          setConfirmationModal({
            isOpen: true,
            type: 'delete',
            items: selectedIds,
            message: `Are you sure you want to delete ${selectedIds.length} selected verse text${selectedIds.length !== 1 ? 's' : ''}? This action can be undone by restoring the texts later.`
          });
          break;
        case 'restore':
          setConfirmationModal({
            isOpen: true,
            type: 'restore',
            items: selectedIds,
            message: `Are you sure you want to restore ${selectedIds.length} selected verse text${selectedIds.length !== 1 ? 's' : ''}?`
          });
          break;
        default:
          console.warn('Unknown bulk operation:', action);
      }
    } catch (error) {
      console.error('Error in bulk operation:', error);
      toast({
        title: 'Operation failed',
        description: `Failed to ${action} selected texts`,
        variant: 'error'
      });
    }
  }, [bulkOps, updatePublishStatusMutation, toast, setConfirmationModal]);

  // Enhanced form state for text version creation
  const enhancedTextVersionForm = useMemo(() => ({
    ...textVersionForm,
    updateField: (field: string, value: string) => {
      textVersionForm.setFieldValue(field as keyof TextVersionForm, value);
    }
  }), [textVersionForm]);

  // Text version creation handler
  const handleCreateTextVersion = useCallback(async () => {
    if (!projectId || !enhancedTextVersionForm.validateForm() || !dbUser) {
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

      await createTextVersionMutation.mutateAsync({
        name: enhancedTextVersionForm.data.name.trim(),
        language_entity_id: selectedProject.target_language_entity_id,
        bible_version_id: enhancedTextVersionForm.data.selectedBibleVersion,
        text_version_source: 'user_submitted',
        created_by: dbUser.id
      });

      toast({
        title: 'Text version created',
        description: `Successfully created text version "${enhancedTextVersionForm.data.name}"`,
        variant: 'success'
      });

      enhancedTextVersionForm.resetForm();
      modalState.closeModal();
      await refetchTextVersions();
    } catch (error: unknown) {
      console.error('Error creating text version:', error);
      toast({
        title: 'Failed to create text version',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error'
      });
    }
  }, [projectId, enhancedTextVersionForm, dbUser, toast, createTextVersionMutation, selectedProject, modalState, refetchTextVersions]);

  // Computed properties for selection state (based on current page)
  const allCurrentPageSelected = filteredAndSortedTexts.length > 0 && 
    filteredAndSortedTexts.every((text: VerseTextWithRelations) => bulkOps.selectedItems.has(text.id));
  const someCurrentPageSelected = filteredAndSortedTexts.some((text: VerseTextWithRelations) => bulkOps.selectedItems.has(text.id));
  const selectedItems = Array.from(bulkOps.selectedItems);

  // Helper function to safely extract filters as BibleTextFilters type
  const extractBibleTextFilters = (filters: DataTableFilters): BibleTextFilters => {
    return {
      textVersionId: (filters.textVersionId as string) || 'all',
      bookId: (filters.bookId as string) || 'all', 
      chapterId: (filters.chapterId as string) || 'all',
      publishStatus: (filters.publishStatus as string) || 'all',
      searchText: (filters.searchText as string) || '',
      showDeleted: (filters.showDeleted as boolean) || false
    };
  };

  return {
    // State - safely extract filters as expected type for components
    filters: extractBibleTextFilters(tableState.filters),
    sortField: tableState.sortField,
    sortDirection: tableState.sortDirection,
    ...modalState,
    editForm: enhancedEditForm,
    textVersionForm: enhancedTextVersionForm,
    
    // Data
    textVersions: textVersions || [],
    bibleVersions: bibleVersions || [],
    books: books || [],
    chapters: chapters || [],
    chapterVerses: chapterVerses || [],
    filteredAndSortedTexts, // Use server-side filtered, sorted and paginated data
    
    // Pagination state
    currentPage: tableState.currentPage,
    itemsPerPage: tableState.itemsPerPage,
    totalItems,
    totalPages,
    
    // Loading states
    isLoading: verseTextsLoading || textVersionsLoading || booksLoading || chaptersLoading,
    
    // Selection state that matches component expectations
    selectedItems,
    allCurrentPageSelected,
    someCurrentPageSelected,
    
    // Actions that match component expectations - use the ones from tableState
    handleFilterChange: tableState.handleFilterChange,
    handleSort: tableState.handleSort,
    handlePageChange: tableState.handlePageChange,
    handlePageSizeChange: tableState.handlePageSizeChange,
    handleSelectAll,
    handleRowSelect,
    handleEditClick,
    handleSaveEdit,
    handlePublishStatusChange,
    handleUploadComplete,
    executeBulkOperation,
    clearSelection: bulkOps.clearSelection,
    refetchVerseTexts: refetch,
    
    // Mutations
    updatePublishStatusMutation,
    editVerseTextMutation,
    createTextVersionMutation,
    enhancedTextVersionForm,
    handleCreateTextVersion,
    softDeleteVerseTextsMutation,
    restoreVerseTextsMutation,
    handleDelete,
    confirmationModal,
    handleConfirmAction,
    handleCancelConfirmation
  };
} 