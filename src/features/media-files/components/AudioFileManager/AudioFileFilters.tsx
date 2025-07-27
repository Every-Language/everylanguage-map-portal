import React from 'react';
import { Select, SelectItem, Button } from '../../../../shared/design-system';
import type { AudioFileFilters } from '../../hooks/useAudioFileManagement';

export interface AudioFileFiltersProps {
  filters: AudioFileFilters & {
    showDeleted?: boolean;
  };
  handleFilterChange: (field: string, value: string | boolean) => void;
  books: Array<{ id: string; name: string }>;
  chapters: Array<{ id: string; chapter_number: number }>;
}

export const AudioFileFiltersComponent: React.FC<AudioFileFiltersProps> = ({
  filters,
  handleFilterChange,
  books,
  chapters
}) => {
  return (
    <div className="space-y-4">
      {/* Existing Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Book Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Book
          </label>
          <Select
            value={filters.bookId}
            onValueChange={(value) => handleFilterChange('bookId', value)}
          >
            <SelectItem value="all">All Books</SelectItem>
            {books.map((book) => (
              <SelectItem key={book.id} value={book.id}>
                {book.name}
              </SelectItem>
            ))}
          </Select>
        </div>

        {/* Chapter Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Chapter
          </label>
          <Select
            value={filters.chapterId}
            onValueChange={(value) => handleFilterChange('chapterId', value)}
          >
            <SelectItem value="all">All Chapters</SelectItem>
            {chapters.map((chapter) => (
              <SelectItem key={chapter.id} value={chapter.id}>
                Chapter {chapter.chapter_number}
              </SelectItem>
            ))}
          </Select>
        </div>

        {/* Status Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Publish Status
            </label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Upload Status
            </label>
            <Select
              value={filters.uploadStatus}
              onValueChange={(value) => handleFilterChange('uploadStatus', value)}
            >
              <SelectItem value="all">All Upload Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </Select>
          </div>
      </div>

      {/* Show Deleted Toggle - Bottom and Less Prominent */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={filters.showDeleted ? "danger" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('showDeleted', !filters.showDeleted)}
              className="text-xs"
            >
              {filters.showDeleted ? 'Show Active Files' : 'Show Deleted Files'}
            </Button>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {filters.showDeleted ? 'Viewing deleted files' : 'Viewing active files'}
            </span>
          </div>
          {filters.showDeleted && (
            <div className="text-xs text-red-600 dark:text-red-400 font-medium">
              ⚠️ DELETED FILES VIEW
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 