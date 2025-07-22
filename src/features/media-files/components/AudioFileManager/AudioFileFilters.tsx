import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectItem,
  Input
} from '../../../../shared/design-system';
import type { AudioFileFilters } from '../../hooks/useAudioFileManagement';

interface AudioVersion {
  id: string;
  name: string;
}

interface Book {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
}

interface AudioFileFiltersComponentProps {
  filters: AudioFileFilters;
  handleFilterChange: (key: string, value: string) => void;
  audioVersions: AudioVersion[];
  books: Book[];
  chapters: Chapter[];
}

export const AudioFileFiltersComponent: React.FC<AudioFileFiltersComponentProps> = ({
  filters,
  handleFilterChange,
  audioVersions,
  books,
  chapters
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Audio Version
            </label>
            <Select 
              value={filters.audioVersionId} 
              onValueChange={(value) => handleFilterChange('audioVersionId', value)}
            >
              <SelectItem value="all">All Versions</SelectItem>
              {audioVersions?.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.name}
                </SelectItem>
              ))}
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
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
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Upload Status
            </label>
            <Select 
              value={filters.uploadStatus} 
              onValueChange={(value) => handleFilterChange('uploadStatus', value)}
            >
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="uploading">Uploading</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Book
            </label>
            <Select 
              value={filters.bookId} 
              onValueChange={(value) => handleFilterChange('bookId', value)}
            >
              <SelectItem value="all">All Books</SelectItem>
              {books?.map((book) => (
                <SelectItem key={book.id} value={book.id}>
                  {book.name}
                </SelectItem>
              ))}
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Chapter
            </label>
            <Select 
              value={filters.chapterId} 
              onValueChange={(value) => handleFilterChange('chapterId', value)}
              disabled={filters.bookId === 'all'}
            >
              <SelectItem value="all">All Chapters</SelectItem>
              {chapters?.filter(c => filters.bookId === 'all' || c.book_id === filters.bookId)
                .map(chapter => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    Chapter {chapter.chapter_number}
                  </SelectItem>
                ))}
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Search
            </label>
            <Input
              placeholder="Search by filename or verse reference..."
              value={filters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
              className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 