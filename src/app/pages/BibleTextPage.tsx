import React, { useState, useMemo } from 'react';
import { useSelectedProject } from '../../features/dashboard/hooks/useSelectedProject';
import { 
  useTextVersionsByProject, 
  useVerseTextsByProject,
  useUpdateVerseTextPublishStatus,
  useEditVerseText,
  type VerseTextWithRelations
} from '../../shared/hooks/query/text-versions';
import { useBooks, useChapters, useVersesByChapter } from '../../shared/hooks/query/bible-structure';
import { BibleTextUploadModal } from '../../features/upload/components';

import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectItem,
  SearchableSelect,
  Input,
  Button,
  LoadingSpinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Checkbox
} from '../../shared/design-system';

// Using the correct enum values from database
type PublishStatus = 'pending' | 'published' | 'archived';

interface Filters {
  textVersionId: string;
  bookId: string;
  chapterId: string;
  publishStatus: string;
  searchText: string;
}

export const BibleTextPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  
  // State management
  const [filters, setFilters] = useState<Filters>({
    textVersionId: 'all',
    bookId: 'all',
    chapterId: 'all',
    publishStatus: 'all',
    searchText: ''
  });
  
  const [sortField, setSortField] = useState<'verse_text' | 'verse_reference' | 'version' | 'publish_status'>('verse_reference');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVerseText, setEditingVerseText] = useState<VerseTextWithRelations | null>(null);
  const [selectedTexts, setSelectedTexts] = useState<string[]>([]);

  // Edit form state - enhanced with book/chapter/verse selection
  const [editForm, setEditForm] = useState({
    bookId: '',
    chapterId: '',
    verseId: '',
    verseNumber: '',
    verseText: '',
    textVersionId: '',
    publishStatus: 'pending' as PublishStatus
  });

  // Data fetching
  const { data: textVersions, isLoading: textVersionsLoading } = useTextVersionsByProject(selectedProject?.id || '');
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: chapters, isLoading: chaptersLoading } = useChapters();
  const { data: chapterVerses } = useVersesByChapter(editForm.chapterId || null);
  const { data: allVerseTexts, isLoading: verseTextsLoading, refetch: refetchVerseTexts } = useVerseTextsByProject(selectedProject?.id || '');

  // Mutations
  const updatePublishStatusMutation = useUpdateVerseTextPublishStatus();
  const editVerseTextMutation = useEditVerseText();

  // Filter and sort verse texts
  const filteredAndSortedTexts = useMemo(() => {
    if (!allVerseTexts || !selectedProject) return [];
    
    const filtered = allVerseTexts.filter((text: VerseTextWithRelations) => {
      // Filter by text version
      const matchesTextVersion = filters.textVersionId === 'all' || text.text_version_id === filters.textVersionId;
      
      // Filter by book
      const matchesBook = filters.bookId === 'all' || text.verses?.chapters?.books?.id === filters.bookId;
      
      // Filter by chapter 
      const matchesChapter = filters.chapterId === 'all' || text.verses?.chapters?.id === filters.chapterId;
      
      // Filter by publish status
      const matchesPublishStatus = filters.publishStatus === 'all' || (text.publish_status || 'pending') === filters.publishStatus;
      
      // Filter by search text in verse content
      const matchesSearch = !filters.searchText || 
        text.verse_text?.toLowerCase().includes(filters.searchText.toLowerCase());
        
      return matchesTextVersion && matchesBook && matchesChapter && matchesPublishStatus && matchesSearch;
    });
    
    // Sort the filtered results
    filtered.sort((a: VerseTextWithRelations, b: VerseTextWithRelations) => {
      let comparison = 0;
      
      if (sortField === 'verse_text') {
        comparison = (a.verse_text || '').localeCompare(b.verse_text || '');
      } else if (sortField === 'verse_reference') {
        // Sort by book order, then chapter, then verse
        const bookA = a.verses?.chapters?.books?.name || '';
        const bookB = b.verses?.chapters?.books?.name || '';
        const chapterA = a.verses?.chapters?.chapter_number || 0;
        const chapterB = b.verses?.chapters?.chapter_number || 0;
        const verseA = a.verses?.verse_number || 0;
        const verseB = b.verses?.verse_number || 0;
        
        if (bookA !== bookB) {
          comparison = bookA.localeCompare(bookB);
        } else if (chapterA !== chapterB) {
          comparison = chapterA - chapterB;
        } else {
          comparison = verseA - verseB;
        }
      } else if (sortField === 'version') {
        const versionA = a.text_versions?.name || '';
        const versionB = b.text_versions?.name || '';
        comparison = versionA.localeCompare(versionB);
      } else if (sortField === 'publish_status') {
        const statusA = a.publish_status || 'pending';
        const statusB = b.publish_status || 'pending';
        comparison = statusA.localeCompare(statusB);
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [allVerseTexts, selectedProject, filters, sortField, sortDirection]);

  // Handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedTexts([]); // Clear selections when filtering
  };

  const handleSort = (field: 'verse_text' | 'verse_reference' | 'publish_status' | 'version') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleUploadComplete = () => {
    refetchVerseTexts();
  };

  // Individual publish status change
  const handlePublishStatusChange = async (verseTextId: string, newStatus: PublishStatus) => {
    try {
      await updatePublishStatusMutation.mutateAsync({
        verseTextIds: [verseTextId],
        publishStatus: newStatus
      });
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  };

  // Selection logic for bulk operations
  const allCurrentPageSelected = filteredAndSortedTexts.length > 0 && 
    filteredAndSortedTexts.every(text => selectedTexts.includes(text.id));
  const someCurrentPageSelected = filteredAndSortedTexts.some(text => selectedTexts.includes(text.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = filteredAndSortedTexts.map(text => text.id);
      setSelectedTexts(prev => [...new Set([...prev, ...currentPageIds])]);
    } else {
      const currentPageIds = new Set(filteredAndSortedTexts.map(text => text.id));
      setSelectedTexts(prev => prev.filter(id => !currentPageIds.has(id)));
    }
  };

  const handleRowSelect = (textId: string, checked: boolean) => {
    if (checked) {
      setSelectedTexts(prev => [...prev, textId]);
    } else {
      setSelectedTexts(prev => prev.filter(id => id !== textId));
    }
  };

  // Edit functions
  const handleEditClick = (text: VerseTextWithRelations) => {
    setEditingVerseText(text);
    setEditForm({
      bookId: text.verses?.chapters?.books?.id || '',
      chapterId: text.verses?.chapters?.id || '',
      verseId: text.verse_id,
      verseNumber: String(text.verses?.verse_number || ''),
      verseText: text.verse_text || '',
      textVersionId: text.text_version_id,
      publishStatus: text.publish_status || 'pending'
    });
    setShowEditModal(true);
  };

  // Handle cascading selection in edit modal
  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // Reset dependent fields when parent changes
      if (field === 'bookId') {
        newForm.chapterId = '';
        newForm.verseId = '';
      } else if (field === 'chapterId') {
        newForm.verseId = '';
      }
      
      return newForm;
    });
  };

  const handleSaveEdit = async () => {
    if (!editingVerseText || !editForm.verseId) return;
    
    try {
      await editVerseTextMutation.mutateAsync({
        id: editingVerseText.id,
        verseId: editForm.verseId,
        verseText: editForm.verseText,
        textVersionId: editForm.textVersionId
      });
      setShowEditModal(false);
      refetchVerseTexts();
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  };

  const isLoading = verseTextsLoading || textVersionsLoading || booksLoading || chaptersLoading;

  if (!selectedProject) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Project Selected
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please select a project to view Bible text data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bible Text
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage verse text content for {selectedProject.name}
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          Upload Text
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedTexts.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {selectedTexts.length} verse text{selectedTexts.length !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTexts([])}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-800"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-700 dark:text-blue-300">Change publish status:</span>
                <Select 
                  value="bulk-action" 
                  onValueChange={(value) => {
                    if (value !== 'bulk-action') {
                      updatePublishStatusMutation.mutate({
                        verseTextIds: selectedTexts,
                        publishStatus: value as PublishStatus
                      });
                      setSelectedTexts([]);
                    }
                  }}
                >
                  <SelectItem value="bulk-action">Change Status</SelectItem>
                  <SelectItem value="pending">Set to Pending</SelectItem>
                  <SelectItem value="published">Set to Published</SelectItem>
                  <SelectItem value="archived">Set to Archived</SelectItem>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Text Version</label>
              <SearchableSelect 
                options={[
                  { value: 'all', label: 'All Versions' },
                  ...(textVersions?.map(version => ({ value: version.id, label: version.name })) || [])
                ]}
                value={filters.textVersionId} 
                onValueChange={(value) => handleFilterChange('textVersionId', value)}
                placeholder="Select Version"
                searchPlaceholder="Search versions..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Book</label>
              <SearchableSelect 
                options={[
                  { value: 'all', label: 'All Books' },
                  ...(books?.map(book => ({ value: book.id, label: book.name })) || [])
                ]}
                value={filters.bookId} 
                onValueChange={(value) => handleFilterChange('bookId', value)}
                placeholder="Select Book"
                searchPlaceholder="Search books..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Chapter</label>
              <SearchableSelect 
                options={[
                  { value: 'all', label: 'All Chapters' },
                  ...(chapters?.filter(c => filters.bookId === 'all' || c.book_id === filters.bookId).map(chapter => ({ value: chapter.id, label: `Chapter ${chapter.chapter_number}` })) || [])
                ]}
                value={filters.chapterId} 
                onValueChange={(value) => handleFilterChange('chapterId', value)}
                disabled={filters.bookId === 'all'}
                placeholder="Select Chapter"
                searchPlaceholder="Search chapters..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Publish Status</label>
              <Select 
                value={filters.publishStatus} 
                onValueChange={(value) => handleFilterChange('publishStatus', value)}
              >
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Search Text</label>
              <Input
                placeholder="Search in verse text..."
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verse Texts ({filteredAndSortedTexts.length} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading verse texts...</span>
            </div>
          ) : filteredAndSortedTexts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No verse texts found</p>
              <Button onClick={() => setShowUploadModal(true)}>
                Upload Your First Verses
              </Button>
            </div>
          ) : (
            <div className="space-y-4 relative">
              {/* Floating Bulk Operations */}
              {selectedTexts.length > 0 && (
                <div className="fixed top-4 right-4 z-50 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-lg p-3 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {selectedTexts.length} verse text{selectedTexts.length !== 1 ? 's' : ''} selected
                    </span>
                    <Select 
                      value="bulk-action" 
                      onValueChange={(value) => {
                        if (value !== 'bulk-action') {
                          updatePublishStatusMutation.mutate({
                            verseTextIds: selectedTexts,
                            publishStatus: value as PublishStatus
                          });
                          setSelectedTexts([]);
                        }
                      }}
                    >
                      <SelectItem value="bulk-action">Change Status</SelectItem>
                      <SelectItem value="pending">Set to Pending</SelectItem>
                      <SelectItem value="published">Set to Published</SelectItem>
                      <SelectItem value="archived">Set to Archived</SelectItem>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTexts([])}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-800"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                        <div className="flex items-center">
                          <Checkbox
                            checked={allCurrentPageSelected}
                            onCheckedChange={handleSelectAll}
                          />
                          {someCurrentPageSelected && !allCurrentPageSelected && (
                            <div className="absolute w-4 h-4 bg-primary-600 rounded-sm flex items-center justify-center">
                              <div className="w-2 h-0.5 bg-white rounded"></div>
                            </div>
                          )}
                        </div>
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => handleSort('version')}
                          className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <span>Version</span>
                          {sortField === 'version' && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => handleSort('verse_reference')}
                          className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <span>Reference</span>
                          {sortField === 'verse_reference' && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => handleSort('verse_text')}
                          className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <span>Text</span>
                          {sortField === 'verse_text' && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => handleSort('publish_status')}
                          className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <span>Status</span>
                          {sortField === 'publish_status' && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedTexts.map((text: VerseTextWithRelations) => (
                      <tr key={text.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedTexts.includes(text.id)}
                            onCheckedChange={(checked) => handleRowSelect(text.id, checked as boolean)}
                          />
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {textVersions?.find(v => v.id === text.text_version_id)?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {text.verses?.chapters?.books?.name || ''} {text.verses?.chapters?.chapter_number || 0}:{text.verses?.verse_number || 0}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="max-w-md">
                            <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                              {text.verse_text}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <Select 
                              value={text.publish_status || 'pending'} 
                              onValueChange={(value) => handlePublishStatusChange(text.id, value as PublishStatus)}
                            >
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </Select>
                          </div>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(text)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <BibleTextUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadComplete={handleUploadComplete}
      />

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Edit Verse Text</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Book, Chapter, Verse
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Book</label>
                  <SearchableSelect 
                    options={books?.map(book => ({ value: book.id, label: book.name })) || []}
                    value={editForm.bookId} 
                    onValueChange={(value) => handleEditFormChange('bookId', value)}
                    placeholder="Select Book"
                    searchPlaceholder="Search books..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Chapter</label>
                  <SearchableSelect 
                    options={chapters?.filter(c => c.book_id === editForm.bookId).map(chapter => ({ value: chapter.id, label: `Chapter ${chapter.chapter_number}` })) || []}
                    value={editForm.chapterId} 
                    onValueChange={(value) => handleEditFormChange('chapterId', value)}
                    disabled={!editForm.bookId}
                    placeholder="Select Chapter"
                    searchPlaceholder="Search chapters..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Verse</label>
                  <SearchableSelect 
                    options={chapterVerses?.map(verse => ({ value: verse.id, label: `Verse ${verse.verse_number}` })) || []}
                    value={editForm.verseId} 
                    onValueChange={(value) => handleEditFormChange('verseId', value)}
                    disabled={!editForm.chapterId}
                    placeholder="Select Verse"
                    searchPlaceholder="Search verses..."
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Text Version
              </label>
              <SearchableSelect 
                options={textVersions?.map(version => ({ value: version.id, label: version.name })) || []}
                value={editForm.textVersionId} 
                onValueChange={(value) => handleEditFormChange('textVersionId', value)}
                placeholder="Select Text Version"
                searchPlaceholder="Search versions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Verse Text
              </label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                value={editForm.verseText}
                onChange={(e) => handleEditFormChange('verseText', e.target.value)}
                placeholder="Enter verse text..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Publish Status
              </label>
              <Select value={editForm.publishStatus} onValueChange={(value) => handleEditFormChange('publishStatus', value)}>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editVerseTextMutation.isPending}>
              {editVerseTextMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 