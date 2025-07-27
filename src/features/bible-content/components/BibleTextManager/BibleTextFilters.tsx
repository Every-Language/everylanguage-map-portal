import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectItem,
  SearchableSelect
} from '../../../../shared/design-system';

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
    bookId: string;
    chapterId: string;
    publishStatus: string;
    searchText: string;
  };
  handleFilterChange: (key: string, value: string) => void;
  books: Book[];
  chapters: Chapter[];
}

export const BibleTextFiltersComponent: React.FC<BibleTextFiltersProps> = ({
  filters,
  handleFilterChange,
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
        </div>
      </CardContent>
    </Card>
  );
}; 