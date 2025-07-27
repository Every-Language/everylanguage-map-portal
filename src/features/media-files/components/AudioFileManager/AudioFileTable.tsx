import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Checkbox,
  Input,
  Select,
  SelectItem,
  LoadingSpinner,
  Pagination
} from '../../../../shared/design-system';
import { 
  PencilIcon, 
  PlayIcon, 
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import type { MediaFileWithVerseInfo } from '../../../../shared/hooks/query/media-files';
import { useMediaFilesVerseTimestamps } from '../../../../shared/hooks/query/media-files';

type SortField = 'filename' | 'upload_status' | 'publish_status' | 'created_at' | 'verse_reference';
type PublishStatus = 'pending' | 'published' | 'archived';

interface AudioFileTableProps {
  // Data
  mediaFiles: MediaFileWithVerseInfo[];
  isLoading: boolean;
  
  // Selection state
  selectedItems: string[];
  allCurrentPageSelected: boolean;
  someCurrentPageSelected: boolean;
  
  // Sorting
  sortField: SortField | null;
  sortDirection: 'asc' | 'desc' | null;
  handleSort: (field: SortField) => void;
  
  // Search
  searchText?: string;
  onSearchChange?: (value: string) => void;
  
  // Actions
  handleSelectAll: (checked: boolean) => void;
  handleRowSelect: (id: string, checked: boolean) => void;
  handleEditClick: (file: MediaFileWithVerseInfo) => void;
  handlePublishStatusChange: (id: string, status: PublishStatus) => void;
  handlePlay: (file: MediaFileWithVerseInfo) => void;
  handleDownload: (file: MediaFileWithVerseInfo) => void;
  handleVerseMarking: (file: MediaFileWithVerseInfo) => void;
  
  // Bulk operations
  executeBulkOperation?: (operationId: string) => void;
  clearSelection?: () => void;
  
  // Download state
  downloadState: {
    isDownloading: boolean;
    downloadingFileId?: string | null;
    progress: number;
  };
  
  // Audio loading state
  loadingAudioId: string | null;
  
  // Pagination props
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export const AudioFileTable: React.FC<AudioFileTableProps> = ({
  mediaFiles,
  isLoading,
  selectedItems,
  allCurrentPageSelected,
  someCurrentPageSelected,
  sortField,
  sortDirection,
  handleSort,
  searchText = '',
  onSearchChange,
  handleSelectAll,
  handleRowSelect,
  handleEditClick,
  handlePublishStatusChange,
  handlePlay,
  handleDownload,
  handleVerseMarking,
  executeBulkOperation,
  clearSelection,
  downloadState,
  loadingAudioId,
  currentPage = 1,
  itemsPerPage = 25,
  totalItems = 0,
  totalPages = 1,
  onPageChange,
  onPageSizeChange
}) => {
  // State for expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Get media file IDs for verse timestamps query
  const mediaFileIds = useMemo(() => mediaFiles.map(file => file.id), [mediaFiles]);
  
  // Fetch verse timestamps for all media files
  const { data: verseTimestamps = {}, isLoading: loadingTimestamps } = useMediaFilesVerseTimestamps(mediaFileIds);

  // Toggle row expansion
  const toggleRowExpansion = (fileId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // Helper function to get status colors
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'uploading':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 animate-pulse';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      // Legacy statuses
      case 'uploaded':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  // Helper function to truncate filenames
  const truncateFilename = (filename: string, maxLength: number = 30) => {
    if (filename.length <= maxLength) return filename;
    return filename.substring(0, maxLength) + '...';
  };

  // Helper function to format duration
  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00:00';
    
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  // Helper function to format time
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00:00';
    
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  // Helper function to get verse timestamps status
  const getVerseTimestampsStatus = (fileId: string) => {
    const timestamps = verseTimestamps[fileId];
    if (!timestamps || timestamps.length === 0) {
      return { hasTimestamps: false, count: 0 };
    }
    return { hasTimestamps: true, count: timestamps.length };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Audio Files ({totalItems} total{totalPages > 1 ? `, showing ${mediaFiles.length} on page ${currentPage}` : ''})
          </CardTitle>
          
          {/* Search Bar */}
          {onSearchChange && (
            <div className="w-64">
              <Input
                placeholder="Search by filename or verse reference..."
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading audio files...</span>
          </div>
        ) : mediaFiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No audio files found.</p>
          </div>
        ) : (
          <div className="space-y-4 relative">
            {/* Floating Bulk Operations */}
            {selectedItems.length > 0 && executeBulkOperation && clearSelection && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-blue-50 dark:bg-blue-900/90 border border-blue-200 dark:border-blue-700 rounded-full px-4 py-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {selectedItems.length} audio file{selectedItems.length !== 1 ? 's' : ''} selected
                  </span>
                  <Select 
                    value="bulk-action" 
                    onValueChange={(value) => {
                      if (value !== 'bulk-action') {
                        executeBulkOperation(value);
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
                    onClick={clearSelection}
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
                        onClick={() => handleSort('verse_reference')}
                        className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <span>Verse Reference</span>
                        {sortField === 'verse_reference' && (
                          <span className="text-blue-600 dark:text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      <button
                        onClick={() => handleSort('filename')}
                        className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <span>Filename</span>
                        {sortField === 'filename' && (
                          <span className="text-blue-600 dark:text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      <span className="flex items-center space-x-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>Verse Timestamps</span>
                      </span>
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      <button
                        onClick={() => handleSort('upload_status')}
                        className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <span>Upload Status</span>
                        {sortField === 'upload_status' && (
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
                  {mediaFiles.map((file: MediaFileWithVerseInfo) => {
                    const isExpanded = expandedRows.has(file.id);
                    const timestampsStatus = getVerseTimestampsStatus(file.id);
                    const fileTimestamps = verseTimestamps[file.id] || [];

                    return (
                      <React.Fragment key={file.id}>
                        {/* Main row */}
                        <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedItems.includes(file.id)}
                              onCheckedChange={(checked) => handleRowSelect(file.id, checked as boolean)}
                            />
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {file.verse_reference}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <span 
                                className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate" 
                                title={file.filename}
                              >
                                {truncateFilename(file.filename)}
                              </span>
                              {file.duration_seconds && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                  {formatDuration(file.duration_seconds)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              {timestampsStatus.hasTimestamps ? (
                                <button
                                  onClick={() => toggleRowExpansion(file.id)}
                                  className="flex items-center space-x-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                                  disabled={loadingTimestamps}
                                >
                                  {isExpanded ? (
                                    <ChevronDownIcon className="h-4 w-4" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {timestampsStatus.count} verse{timestampsStatus.count !== 1 ? 's' : ''}
                                  </span>
                                </button>
                              ) : (
                                <span className="text-sm text-gray-400 dark:text-gray-500">
                                  No timestamps
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(file.upload_status)}`}>
                              {file.upload_status === 'uploading' && (
                                <LoadingSpinner size="sm" className="mr-1" />
                              )}
                              {file.upload_status || 'Unknown'}
                            </span>
                          </td>
                          <td className="p-3">
                            <Select 
                              value={file.publish_status || 'pending'} 
                              onValueChange={(value) => handlePublishStatusChange(file.id, value as PublishStatus)}
                            >
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </Select>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePlay(file)}
                                disabled={!file.remote_path || loadingAudioId === file.id}
                                title={loadingAudioId === file.id ? "Loading audio..." : "Play audio"}
                              >
                                {loadingAudioId === file.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <PlayIcon className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(file)}
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(file)}
                                disabled={downloadState.isDownloading && downloadState.downloadingFileId === file.id}
                                title="Download"
                              >
                                {downloadState.isDownloading && downloadState.downloadingFileId === file.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerseMarking(file)}
                                title="Verse Marking"
                              >
                                <ClockIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded row showing verse timestamps */}
                        {isExpanded && timestampsStatus.hasTimestamps && (
                          <tr className="bg-gray-50 dark:bg-gray-800/30">
                            <td colSpan={8} className="p-0">
                              <div className="px-6 py-4 border-l-4 border-blue-200 dark:border-blue-700">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                                  Verse Timestamps ({fileTimestamps.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {fileTimestamps.map((verse) => (
                                    <div 
                                      key={verse.id}
                                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Verse {verse.verse_number}
                                      </span>
                                      <div className="text-right">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          {formatTime(verse.start_time_seconds)}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                          {formatTime(verse.duration_seconds)} duration
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && onPageChange && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                  showInfo={true}
                  showSizeChanger={true}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 