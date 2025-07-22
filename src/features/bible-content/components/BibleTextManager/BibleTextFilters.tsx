import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectItem,
  SearchableSelect,
  Input
} from '../../../../shared/design-system';

interface TextVersion {
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

interface BibleTextFiltersProps {
  filters: {
    textVersionId: string;
    bookId: string;
    chapterId: string;
    publishStatus: string;
    searchText: string;
  };
  handleFilterChange: (key: string, value: string) => void;
  textVersions: TextVersion[];
  books: Book[];
  chapters: Chapter[];
}

export const BibleTextFiltersComponent: React.FC<BibleTextFiltersProps> = ({
  filters,
  handleFilterChange,
  textVersions,
  books,
  chapters
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Text Version
            </label>
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
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Book
            </label>
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
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Chapter
            </label>
            <SearchableSelect 
              options={[
                { value: 'all', label: 'All Chapters' },
                ...(chapters?.filter(c => filters.bookId === 'all' || c.book_id === filters.bookId)
                    .map(chapter => ({ value: chapter.id, label: `Chapter ${chapter.chapter_number}` })) || [])
              ]}
              value={filters.chapterId} 
              onValueChange={(value) => handleFilterChange('chapterId', value)}
              disabled={filters.bookId === 'all'}
              placeholder="Select Chapter"
              searchPlaceholder="Search chapters..."
            />
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
              Search Text
            </label>
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
  );
}; 