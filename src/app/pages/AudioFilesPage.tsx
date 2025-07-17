import React, { useState, useMemo } from 'react';
import { useSelectedProject } from '../../features/dashboard/hooks/useSelectedProject';
import { useMediaFilesByProject, useUpdateMediaFile, type MediaFile } from '../../shared/hooks/query/media-files';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Button,
  Checkbox,
  LoadingSpinner
} from '../../shared/design-system';
import { downloadCSV, downloadJSON, formatters, generateFilename, type ExportColumn } from '../../shared/utils/exportData';
import { AudioUploadModal } from '../../features/upload/components';
import { PlusIcon } from '@heroicons/react/24/outline';

interface EditingState {
  [fileId: string]: {
    media_type?: 'audio' | 'video';
    is_bible_audio?: boolean;
    start_verse_id?: string;
    end_verse_id?: string;
  };
}

export const AudioFilesPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  const { data: mediaFiles, isLoading, error, refetch } = useMediaFilesByProject(selectedProject?.id || null);
  const updateMediaFile = useUpdateMediaFile();

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Editing state
  const [editingRows, setEditingRows] = useState<EditingState>({});
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Filter and sort media files
  const filteredAndSortedFiles = useMemo(() => {
    if (!mediaFiles) return [];

    const filtered = mediaFiles.filter((file) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (file.local_path && file.local_path.toLowerCase().includes(searchLower)) ||
        (file.remote_path && file.remote_path.toLowerCase().includes(searchLower));

      // Status filter
      const matchesStatus = statusFilter === 'all' || file.upload_status === statusFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || file.media_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: unknown = a[sortField as keyof MediaFile];
      let bValue: unknown = b[sortField as keyof MediaFile];

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Convert to string for comparison
      aValue = String(aValue);
      bValue = String(bValue);

      const result = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? result : -result;
    });

    return filtered;
  }, [mediaFiles, searchTerm, statusFilter, typeFilter, sortField, sortDirection]);

  // Paginated files
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedFiles, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedFiles.length / itemsPerPage);

  // Helper functions
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const startEditing = (file: MediaFile) => {
    setEditingRows(prev => ({
      ...prev,
      [file.id]: {
        media_type: (file.media_type as 'audio' | 'video') || 'audio',
        is_bible_audio: file.is_bible_audio || false,
        start_verse_id: file.start_verse_id || '',
        end_verse_id: file.end_verse_id || ''
      }
    }));
  };

  const cancelEditing = (fileId: string) => {
    setEditingRows(prev => {
      const newState = { ...prev };
      delete newState[fileId];
      return newState;
    });
  };

  const saveEditing = async (file: MediaFile) => {
    const edits = editingRows[file.id];
    if (!edits) return;

    try {
      await updateMediaFile.mutateAsync({
        id: file.id,
        updates: {
          media_type: edits.media_type,
          is_bible_audio: edits.is_bible_audio,
          start_verse_id: edits.start_verse_id || null,
          end_verse_id: edits.end_verse_id || null,
        }
      });
      cancelEditing(file.id);
    } catch (error) {
      console.error('Failed to update media file:', error);
    }
  };

  const updateEditingField = (fileId: string, field: string, value: unknown) => {
    setEditingRows(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        [field]: value
      }
    }));
  };

  // Export functionality
  const exportColumns: ExportColumn[] = [
    { key: 'filename', header: 'Filename' },
    { key: 'book_name', header: 'Book' },
    { key: 'chapter_number', header: 'Chapter' },
    { key: 'start_verse', header: 'Start Verse' },
    { key: 'end_verse', header: 'End Verse' },
    { key: 'duration_seconds', header: 'Duration', formatter: formatters.duration },
    { key: 'upload_status', header: 'Upload Status', formatter: formatters.status },
    { key: 'check_status', header: 'Check Status', formatter: formatters.status },
    { key: 'publish_status', header: 'Publish Status', formatter: formatters.status },
    { key: 'created_at', header: 'Created', formatter: formatters.dateTime },
    { key: 'updated_at', header: 'Updated', formatter: formatters.dateTime },
  ];

  const handleExportCSV = () => {
    const projectName = selectedProject?.name?.replace(/\s+/g, '_') || 'project';
    const filename = generateFilename(`${projectName}_audio_files`, 'csv');
    downloadCSV(filteredAndSortedFiles, exportColumns, { filename });
  };

  const handleExportJSON = () => {
    const projectName = selectedProject?.name?.replace(/\s+/g, '_') || 'project';
    const filename = generateFilename(`${projectName}_audio_files`, 'json');
    downloadJSON(filteredAndSortedFiles, { filename });
  };

  const toggleBulkSelection = (fileId: string) => {
    setBulkSelection(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId);
      } else {
        newSelection.add(fileId);
      }
      return newSelection;
    });
  };

  const selectAll = () => {
    setBulkSelection(new Set(paginatedFiles.map(f => f.id)));
  };

  const clearSelection = () => {
    setBulkSelection(new Set());
  };

  // Status badge colors
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'uploading': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getCheckStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'requires_review': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (!selectedProject) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto mt-16 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            No Project Selected
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Please select a project from the sidebar to view audio files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Audio Files
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage and edit audio files for {selectedProject.name}
          </p>
        </div>
        <Button 
          onClick={() => setShowUploadModal(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Upload Audio</span>
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audio Files</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={filteredAndSortedFiles.length === 0}
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                disabled={filteredAndSortedFiles.length === 0}
              >
                Export JSON
              </Button>
              {bulkSelection.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {bulkSelection.size} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Upload Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="uploading">Uploading</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Media Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
              <span className="ml-3 text-neutral-600 dark:text-neutral-400">Loading audio files...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center text-red-600 dark:text-red-400 p-8">
              Failed to load audio files. Please try again.
            </div>
          )}

          {/* Data Table */}
          {!isLoading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className="bg-neutral-50 dark:bg-neutral-800">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <Checkbox
                          checked={bulkSelection.size === paginatedFiles.length && paginatedFiles.length > 0}
                          onChange={bulkSelection.size === paginatedFiles.length ? clearSelection : selectAll}
                        />
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('local_path')}
                      >
                        Filename
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Bible Audio
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('upload_status')}
                      >
                        Upload Status
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('check_status')}
                      >
                        Check Status
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('updated_at')}
                      >
                        Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {paginatedFiles.map((file) => {
                      const isEditing = editingRows[file.id];
                      const isSelected = bulkSelection.has(file.id);
                      
                      return (
                        <tr 
                          key={file.id} 
                          className={`hover:bg-neutral-50 dark:hover:bg-neutral-800 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleBulkSelection(file.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {file.local_path?.split('/').pop() || file.remote_path?.split('/').pop() || 'Unknown'}
                            </div>
                            {file.duration_seconds && (
                              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                {Math.floor(file.duration_seconds / 60)}:{(file.duration_seconds % 60).toString().padStart(2, '0')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={isEditing.media_type} 
                                onChange={(e) => updateEditingField(file.id, 'media_type', e.target.value as 'audio' | 'video')}
                                className="px-2 py-1 border border-neutral-200 rounded"
                              >
                                <option value="audio">Audio</option>
                                <option value="video">Video</option>
                              </select>
                            ) : (
                              <span className="text-sm text-neutral-900 dark:text-neutral-100">
                                {file.media_type || 'audio'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <Checkbox
                                checked={isEditing.is_bible_audio}
                                onChange={(checked) => updateEditingField(file.id, 'is_bible_audio', checked)}
                              />
                            ) : (
                              <span className="text-sm text-neutral-900 dark:text-neutral-100">
                                {file.is_bible_audio ? 'Yes' : 'No'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(file.upload_status)}`}>
                              {file.upload_status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCheckStatusColor(file.check_status)}`}>
                              {file.check_status || 'not checked'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                            {file.updated_at ? new Date(file.updated_at).toLocaleDateString() : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => saveEditing(file)}
                                  disabled={updateMediaFile.isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelEditing(file.id)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(file)}
                              >
                                Edit
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedFiles.length)} of {filteredAndSortedFiles.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredAndSortedFiles.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    No audio files found
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                      ? 'Try adjusting your filters or search terms.'
                      : 'Upload some audio files to get started.'
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <AudioUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadComplete={() => {
          refetch(); // Refresh the media files list
        }}
      />
    </div>
  );
}; 