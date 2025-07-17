import React, { useState, useMemo } from 'react';
import { useSelectedProject } from '../../features/dashboard/hooks/useSelectedProject';
import { 
  useMediaFilesByProject, 
  useUpdateMediaFileStatus, 
  useBatchUpdateMediaFileStatus,
  type MediaFile 
} from '../../shared/hooks/query/media-files';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  LoadingSpinner,
  AudioPlayer,
  Select,
  SelectItem,
  Input
} from '../../shared/design-system';
import { 
  CheckIcon, 
  XMarkIcon, 
  ClockIcon,
  UserIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';

interface MediaFileWithRelations extends MediaFile {
  books?: { name: string };
  chapters?: { chapter_number: number };
  users?: { display_name: string; email: string };
}

type CheckStatus = 'pending' | 'approved' | 'rejected' | 'requires_review';

interface CheckingFilters {
  assignedTo: string;
  bookName: string;
  sortBy: 'created_at' | 'updated_at' | 'filename';
  sortOrder: 'asc' | 'desc';
}

export const CommunityCheckPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  
  // Filter states
  const [filters, setFilters] = useState<CheckingFilters>({
    assignedTo: '',
    bookName: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  
  // Selection states
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState<CheckStatus>('approved');
  
  // Data queries
  const { data: allMediaFiles, isLoading: mediaFilesLoading } = useMediaFilesByProject(selectedProject?.id || null);
  
  // Filter to only pending check files
  const pendingCheckFiles = useMemo(() => {
    if (!allMediaFiles) return [];
    
    return allMediaFiles.filter((file: MediaFileWithRelations) => {
      const isUploaded = file.upload_status === 'completed';
      const isPendingCheck = file.check_status === 'pending';
      
      // Apply additional filters
      const matchesAssignee = !filters.assignedTo || file.users?.email === filters.assignedTo;
      const matchesBook = !filters.bookName || 
        file.books?.name?.toLowerCase().includes(filters.bookName.toLowerCase());
      
      return isUploaded && isPendingCheck && matchesAssignee && matchesBook;
    });
  }, [allMediaFiles, filters]);
  
  // Sort and paginate results
  const sortedFiles = useMemo(() => {
    const sorted = [...pendingCheckFiles].sort((a: MediaFileWithRelations, b: MediaFileWithRelations) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'created_at': {
          comparison = new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
          break;
        }
        case 'updated_at': {
          comparison = new Date(a.updated_at || '').getTime() - new Date(b.updated_at || '').getTime();
          break;
        }
        case 'filename': {
          const aFilename = a.remote_path?.split('/').pop() || a.local_path || '';
          const bFilename = b.remote_path?.split('/').pop() || b.local_path || '';
          comparison = aFilename.localeCompare(bFilename);
          break;
        }
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [pendingCheckFiles, filters.sortBy, filters.sortOrder]);

  const handleFileSelect = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(sortedFiles.map(file => file.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSingleFileStatus = (fileId: string, status: CheckStatus) => {
    updateFileStatusMutation.mutate({ fileId, status });
  };

  const handleBatchStatusUpdate = () => {
    if (selectedFiles.size === 0) return;
    
    batchUpdateMutation.mutate({ 
      fileIds: Array.from(selectedFiles), 
      status: batchStatus 
    });
    setSelectedFiles(new Set()); // Clear selection after batch update
  };

  const handleFilterChange = (key: keyof CheckingFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Get unique assignees for filters
  const availableAssignees = useMemo(() => {
    const assignees = allMediaFiles?.map((file: MediaFileWithRelations) => file.users)
      .filter(Boolean)
      .filter((user, index, self) => 
        self.findIndex(u => u?.email === user?.email) === index
      ) || [];
    return assignees;
  }, [allMediaFiles]);

  // Add the mutation hooks
  const updateFileStatusMutation = useUpdateMediaFileStatus();
  const batchUpdateMutation = useBatchUpdateMediaFileStatus();

  if (!selectedProject) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Community Check
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Review and approve uploaded audio files
          </p>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 text-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            Please select a project to access community checking
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Community Check
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Review and approve uploaded audio files for {selectedProject.name}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {mediaFilesLoading ? '-' : pendingCheckFiles.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <UserIcon className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Selected Files
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedFiles.size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <SpeakerWaveIcon className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Total Audio Files
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {mediaFilesLoading ? '-' : allMediaFiles?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckIcon className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Your Role
                </p>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Community Checker
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Batch Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters & Batch Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Assigned To
              </label>
              <Select
                value={filters.assignedTo}
                onValueChange={(value) => handleFilterChange('assignedTo', value)}
                placeholder="All assignees"
              >
                {availableAssignees.map((assignee) => (
                  <SelectItem key={assignee?.email} value={assignee?.email || ''}>
                    {assignee?.display_name || assignee?.email}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Book Filter
              </label>
              <Input
                type="text"
                placeholder="Search books..."
                value={filters.bookName}
                onChange={(e) => handleFilterChange('bookName', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Sort By
              </label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                <SelectItem value="created_at">Upload Date</SelectItem>
                <SelectItem value="updated_at">Last Modified</SelectItem>
                <SelectItem value="filename">Filename</SelectItem>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Order
              </label>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) => handleFilterChange('sortOrder', value)}
              >
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </Select>
            </div>
          </div>

          {/* Batch Actions */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {selectedFiles.size} files selected
              </span>
              <Select
                value={batchStatus}
                onValueChange={(value) => setBatchStatus(value as CheckStatus)}
              >
                <SelectItem value="approved">Approve</SelectItem>
                <SelectItem value="rejected">Reject</SelectItem>
                <SelectItem value="requires_review">Needs Review</SelectItem>
              </Select>
              <Button onClick={handleBatchStatusUpdate} disabled={batchUpdateMutation.isPending}>
                {batchUpdateMutation.isPending ? <LoadingSpinner className="mr-2" /> : 'Update Selected'}
              </Button>
              <Button variant="outline" onClick={() => setSelectedFiles(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Files Pending Review</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedFiles.size === sortedFiles.length && sortedFiles.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Select All
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mediaFilesLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400 mb-2">
                No files pending review
              </p>
              <p className="text-sm text-neutral-500">
                All uploaded files have been checked or there are no uploads ready for review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedFiles.map((file: MediaFileWithRelations) => (
                <div
                  key={file.id}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={(e) => handleFileSelect(file.id, e.target.checked)}
                      className="rounded border-neutral-300"
                    />

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                          {file.books?.name} Chapter {file.chapters?.chapter_number}
                        </h3>
                        <span className="text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded">
                          {file.media_type}
                        </span>
                      </div>
                      
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                        {file.remote_path?.split('/').pop() || file.local_path}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <span>Uploaded: {new Date(file.created_at || '').toLocaleDateString()}</span>
                        {file.duration_seconds && (
                          <span>Duration: {Math.round(file.duration_seconds)}s</span>
                        )}
                        {file.users && (
                          <span>By: {file.users.display_name || file.users.email}</span>
                        )}
                      </div>
                    </div>

                    {/* Audio Player */}
                    {file.remote_path && (
                      <div className="w-64">
                        <AudioPlayer
                          src={file.remote_path}
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSingleFileStatus(file.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSingleFileStatus(file.id, 'requires_review')}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        <ClockIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSingleFileStatus(file.id, 'rejected')}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 