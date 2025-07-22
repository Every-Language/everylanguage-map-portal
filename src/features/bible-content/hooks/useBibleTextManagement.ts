import { useDataTableState, type DataTableFilters } from '../../../shared/hooks/useDataTableState';
import { useModalState } from '../../../shared/hooks/useModalState';
import { useBulkOperations } from '../../../shared/hooks/useBulkOperations';
import { useFormState } from '../../../shared/hooks/useFormState';
import {
  useTextVersionsByProject,
  useVerseTextsByProject,
  useUpdateVerseTextPublishStatus,
  useEditVerseText,
  type VerseTextWithRelations
} from '../../../shared/hooks/query/text-versions';
import { useBooks, useChapters, useVersesByChapter } from '../../../shared/hooks/query/bible-structure';
import { useMemo, useCallback } from 'react';

export interface BibleTextFilters {
  textVersionId: string;
  bookId: string;
  chapterId: string;
  publishStatus: string;
  searchText: string;
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
      searchText: ''
    },
    initialSort: {
      field: 'verse_reference',
      direction: 'asc'
    }
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

  // Data fetching
  const { data: textVersions, isLoading: textVersionsLoading } = useTextVersionsByProject(projectId || '');
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: chapters, isLoading: chaptersLoading } = useChapters();
  const { data: chapterVerses } = useVersesByChapter(editForm.data.chapterId || null);
  const { data: allVerseTexts, isLoading: verseTextsLoading, refetch: refetchVerseTexts } = useVerseTextsByProject(projectId || '');

  // Mutations
  const updatePublishStatusMutation = useUpdateVerseTextPublishStatus();
  const editVerseTextMutation = useEditVerseText();

  // Filter and sort verse texts
  const filteredAndSortedTexts = useMemo(() => {
    if (!allVerseTexts || !projectId) return [];
    
    const filtered = allVerseTexts.filter((text: VerseTextWithRelations) => {
      const matchesTextVersion = tableState.filters.textVersionId === 'all' || text.text_version_id === tableState.filters.textVersionId;
      const matchesBook = tableState.filters.bookId === 'all' || text.verses?.chapters?.books?.id === tableState.filters.bookId;
      const matchesChapter = tableState.filters.chapterId === 'all' || text.verses?.chapters?.id === tableState.filters.chapterId;
      const matchesPublishStatus = tableState.filters.publishStatus === 'all' || (text.publish_status || 'pending') === tableState.filters.publishStatus;
      const matchesSearch = !tableState.filters.searchText || 
        (typeof tableState.filters.searchText === 'string' && 
         text.verse_text?.toLowerCase().includes(tableState.filters.searchText.toLowerCase()));
        
      return matchesTextVersion && matchesBook && matchesChapter && matchesPublishStatus && matchesSearch;
    });

    // Sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (tableState.sortField) {
        case 'verse_text': {
          comparison = (a.verse_text || '').localeCompare(b.verse_text || '');
          break;
        }
        case 'verse_reference': {
          const aRef = `${a.verses?.chapters?.books?.name || ''} ${a.verses?.chapters?.chapter_number || 0}:${a.verses?.verse_number || 0}`;
          const bRef = `${b.verses?.chapters?.books?.name || ''} ${b.verses?.chapters?.chapter_number || 0}:${b.verses?.verse_number || 0}`;
          comparison = aRef.localeCompare(bRef);
          break;
        }
        case 'version':
          comparison = (a.version || 0) - (b.version || 0);
          break;
        case 'publish_status':
          comparison = (a.publish_status || 'pending').localeCompare(b.publish_status || 'pending');
          break;
        default:
          comparison = 0;
      }
      
      return tableState.sortDirection === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [allVerseTexts, projectId, tableState.filters, tableState.sortField, tableState.sortDirection]);

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
    modalState.openModal('edit', { currentVerseText: text });
  }, [enhancedEditForm, modalState]);

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
    refetchVerseTexts();
  };

  // Selection handlers that match component expectations
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      bulkOps.selectAll(filteredAndSortedTexts);
    } else {
      bulkOps.clearSelection();
    }
  }, [filteredAndSortedTexts, bulkOps]);

  const handleRowSelect = useCallback((id: string, checked: boolean) => {
    bulkOps.selectItem(id, checked);
  }, [bulkOps]);

  // Execute bulk operation handler
  const executeBulkOperation = useCallback(async (operationId: string) => {
    await bulkOps.performBulkOperation(operationId);
  }, [bulkOps]);

  // Computed properties for selection state
  const allCurrentPageSelected = filteredAndSortedTexts.length > 0 && 
    filteredAndSortedTexts.every(text => bulkOps.selectedItems.has(text.id));
  const someCurrentPageSelected = filteredAndSortedTexts.some(text => bulkOps.selectedItems.has(text.id));
  const selectedItems = Array.from(bulkOps.selectedItems);

  // Helper function to safely extract filters as BibleTextFilters type
  const extractBibleTextFilters = (filters: DataTableFilters): BibleTextFilters => {
    return {
      textVersionId: (filters.textVersionId as string) || 'all',
      bookId: (filters.bookId as string) || 'all', 
      chapterId: (filters.chapterId as string) || 'all',
      publishStatus: (filters.publishStatus as string) || 'all',
      searchText: (filters.searchText as string) || ''
    };
  };

  return {
    // State - safely extract filters as expected type for components
    filters: extractBibleTextFilters(tableState.filters),
    sortField: tableState.sortField,
    sortDirection: tableState.sortDirection,
    ...modalState,
    editForm: enhancedEditForm,
    
    // Data
    textVersions: textVersions || [],
    books: books || [],
    chapters: chapters || [],
    chapterVerses: chapterVerses || [],
    filteredAndSortedTexts,
    
    // Loading states
    isLoading: verseTextsLoading || textVersionsLoading || booksLoading || chaptersLoading,
    
    // Selection state that matches component expectations
    selectedItems,
    allCurrentPageSelected,
    someCurrentPageSelected,
    
    // Actions that match component expectations - use the ones from tableState
    handleFilterChange: tableState.handleFilterChange,
    handleSort: tableState.handleSort,
    handleSelectAll,
    handleRowSelect,
    handleEditClick,
    handleSaveEdit,
    handlePublishStatusChange,
    handleUploadComplete,
    executeBulkOperation,
    clearSelection: bulkOps.clearSelection,
    refetchVerseTexts,
    
    // Mutations
    updatePublishStatusMutation,
    editVerseTextMutation
  };
} 