import React from 'react';
import {
  Button,
  Checkbox,
  LoadingSpinner,
  Select,
  SelectItem,
  AudioPlayer
} from '../../../../shared/design-system';
import { PlayIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { MediaFileWithVerseInfo } from '../../../../shared/hooks/query/media-files';

type SortField = 'filename' | 'upload_status' | 'publish_status' | 'created_at';
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
  
  // Actions
  handleSelectAll: (checked: boolean) => void;
  handleRowSelect: (id: string, checked: boolean) => void;
  handleEditClick: (file: MediaFileWithVerseInfo) => void;
  handlePublishStatusChange: (id: string, status: PublishStatus) => void;
  handlePlay: (file: MediaFileWithVerseInfo) => void;
  handleDownload: (file: MediaFileWithVerseInfo) => void;
  handleDelete: (file: MediaFileWithVerseInfo) => void;
  
  // Mutations loading states
  softDeleteFiles?: { isPending: boolean };
  
  // Download state
  downloadState: {
    isDownloading: boolean;
    downloadingFileId?: string | null;
    progress: number;
  };
  
  // Audio player state
  currentAudioFile: MediaFileWithVerseInfo | null;
  audioUrl: string | null;
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
  handleSelectAll,
  handleRowSelect,
  handleEditClick,
  handlePublishStatusChange,
  handlePlay,
  handleDownload,
  handleDelete,
  softDeleteFiles,
  downloadState,
  currentAudioFile,
  audioUrl
}) => {
  // Helper function to get status colors
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'uploaded':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  // Helper function to truncate filenames
  const truncateFilename = (filename: string, maxLength: number = 30) => {
    if (filename.length <= maxLength) return filename;
    return filename.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (mediaFiles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No audio files found.</p>
      </div>
    );
  }

  return (
    <>
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
              <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Verse Reference</th>
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
                  <span>Publish Status</span>
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
            {mediaFiles.map((file: MediaFileWithVerseInfo) => (
              <tr key={file.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-3">
                  <Checkbox
                    checked={selectedItems.includes(file.id)}
                    onCheckedChange={(checked) => handleRowSelect(file.id, checked as boolean)}
                  />
                </td>
                <td className="p-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {file.verse_reference}
                  </span>
                </td>
                <td className="p-3">
                  <div className="max-w-xs">
                    <p className="text-sm text-gray-900 dark:text-gray-100" title={file.filename}>
                      {truncateFilename(file.filename || 'Unknown')}
                    </p>
                    {file.duration_seconds && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.floor(file.duration_seconds / 60)}:{(file.duration_seconds % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(file.upload_status)}`}>
                    {file.upload_status || 'unknown'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={file.publish_status || 'pending'} 
                      onValueChange={(value) => handlePublishStatusChange(file.id, value as PublishStatus)}
                    >
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </Select>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlay(file)}
                      disabled={!file.remote_path}
                      className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
                      title="Play audio"
                    >
                      <PlayIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(file)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      disabled={downloadState.isDownloading && downloadState.downloadingFileId === file.id}
                      className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
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
                      onClick={() => handleDelete(file)}
                      disabled={softDeleteFiles?.isPending}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                      title="Delete"
                    >
                      {softDeleteFiles?.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audio Player Modal */}
      <AudioPlayer
        open={!!currentAudioFile && !!audioUrl}
        onOpenChange={() => {}} // Handle close through the hook
        {...(audioUrl && { audioUrl })}
        title={currentAudioFile?.filename || 'Audio Player'}
        subtitle={currentAudioFile?.verse_reference}
      />
    </>
  );
}; 