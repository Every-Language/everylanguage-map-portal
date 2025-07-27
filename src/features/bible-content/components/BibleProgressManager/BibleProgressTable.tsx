import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Button, Progress, Input } from '../../../../shared/design-system';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../../shared/design-system';
import { ArrowUpTrayIcon, MusicalNoteIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { BookProgress, ChapterProgress } from '../../hooks/useBibleProgress';

interface BibleProgressTableProps {
  bookData: BookProgress[];
  isLoading: boolean;
  selectedVersionType: 'audio' | 'text';
  onBookExpand?: (bookId: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'complete':
      return 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200';
    case 'in_progress':
      return 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200';
    default:
      return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
  }
};

const getStatusIndicatorColor = (status: string) => {
  switch (status) {
    case 'complete':
      return 'bg-secondary-500';
    case 'in_progress':
      return 'bg-accent-500';
    default:
      return 'bg-neutral-300 dark:bg-neutral-600';
  }
};

const formatStatus = (status: string) => {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'in_progress':
      return 'In Progress';
    default:
      return 'Not Started';
  }
};

const ChapterRow: React.FC<{
  chapter: ChapterProgress;
  selectedVersionType: 'audio' | 'text';
  onUpload: (chapterId: string) => void;
}> = ({ chapter, selectedVersionType, onUpload }) => {
  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-neutral-100 dark:hover:bg-neutral-700/50">
      <div className="flex items-center space-x-4 flex-1">
        {/* Status indicator */}
        <div className={`w-3 h-3 rounded-full ${getStatusIndicatorColor(chapter.status)}`} />
        
        {/* Chapter info */}
        <div className="flex-1">
          <div className="font-medium text-neutral-900 dark:text-neutral-100">
            Chapter {chapter.chapterNumber}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {chapter.totalVerses} verses
          </div>
        </div>

        {/* Progress */}
        <div className="w-32">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-600 dark:text-neutral-400">{chapter.progress}%</span>
            {chapter.verseCoverage && (
              <span className="text-neutral-500 dark:text-neutral-500">
                {chapter.verseCoverage.coveredVerses}/{chapter.verseCoverage.totalVerses}
              </span>
            )}
          </div>
          <Progress 
            value={chapter.progress} 
            color={chapter.status === 'complete' ? 'secondary' : chapter.status === 'in_progress' ? 'primary' : 'primary'} 
            className="h-2" 
          />
          {chapter.verseCoverage && chapter.verseCoverage.verseRanges.length > 0 && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {chapter.verseCoverage.verseRanges.map((range, idx) => (
                <span key={idx} className="mr-1">
                  {range.start === range.end ? `v${range.start}` : `v${range.start}-${range.end}`}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Media files count */}
        <div className="w-20 text-center">
          {selectedVersionType === 'audio' ? (
            <div className="flex items-center justify-center space-x-1">
              <MusicalNoteIcon className="h-4 w-4 text-neutral-400" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {chapter.mediaFiles.length}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-1">
              <DocumentTextIcon className="h-4 w-4 text-neutral-400" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {chapter.progress > 0 ? '✓' : '—'}
              </span>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className="w-24">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(chapter.status)}`}>
            {formatStatus(chapter.status)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpload(chapter.chapterId)}
          className="flex items-center space-x-1"
        >
          <ArrowUpTrayIcon className="h-4 w-4" />
          <span>Upload</span>
        </Button>
      </div>
    </div>
  );
};

export const BibleProgressTable: React.FC<BibleProgressTableProps> = ({
  bookData,
  isLoading,
  selectedVersionType,
  onBookExpand
}) => {
  const [expandedBooks, setExpandedBooks] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return bookData;
    
    const query = searchQuery.toLowerCase().trim();
    return bookData.filter(book => 
      book.bookName.toLowerCase().includes(query)
    );
  }, [bookData, searchQuery]);

  const handleBookExpand = (bookIds: string[]) => {
    setExpandedBooks(bookIds);
    
    // Notify parent component about newly expanded books
    if (onBookExpand) {
      const newlyExpanded = bookIds.filter(id => !expandedBooks.includes(id));
      newlyExpanded.forEach(bookId => onBookExpand(bookId));
    }
  };

  const handleUpload = (chapterId: string) => {
    // TODO: Open upload modal with pre-filled chapter info
    console.log('Upload for chapter:', chapterId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="ml-3 text-neutral-600 dark:text-neutral-400">Loading progress data...</span>
        </CardContent>
      </Card>
    );
  }

  if (bookData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bible Books</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              No Progress Data
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              No books found for the selected version. Please check your version selection.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bible Books ({filteredBooks.length} of {bookData.length} books)</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search input */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search bible books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              No Books Found
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              No books match your search query "{searchQuery}".
            </p>
          </div>
        ) : (
          <Accordion type="multiple" value={expandedBooks} onValueChange={handleBookExpand} variant="flat">
            {filteredBooks.map((book) => (
            <AccordionItem key={book.id} value={book.id} variant="flat">
              <AccordionTrigger variant="flat" className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Status indicator */}
                    <div className={`w-3 h-3 rounded-full ${getStatusIndicatorColor(book.status)}`} />
                    
                    {/* Book info */}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {book.bookName}
                        {!book.detailedProgressLoaded && expandedBooks.includes(book.id) && (
                          <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                            (Loading verse details...)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {book.totalChapters} chapters
                        {book.detailedProgressLoaded && (
                          <span className="ml-1 text-neutral-500">• Verse-level progress</span>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-600 dark:text-neutral-400">{book.progress}%</span>
                      </div>
                      <Progress 
                        value={book.progress} 
                        color={book.status === 'complete' ? 'secondary' : book.status === 'in_progress' ? 'primary' : 'primary'} 
                        className="h-2" 
                      />
                    </div>

                    {/* Status badge */}
                    <div className="w-24">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(book.status)}`}>
                        {formatStatus(book.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent variant="flat">
                <div className="pt-4">
                  <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    {/* Chapter headers */}
                    <div className="flex items-center justify-between py-2 px-4 bg-neutral-100 dark:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-t-lg">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-3" /> {/* Status indicator space */}
                        <div className="flex-1">Chapter</div>
                        <div className="w-32 text-center">Progress</div>
                        <div className="w-20 text-center">
                          {selectedVersionType === 'audio' ? 'Files' : 'Text'}
                        </div>
                        <div className="w-24 text-center">Status</div>
                      </div>
                      <div className="w-20 text-center">Actions</div>
                    </div>
                    
                    {/* Chapter rows */}
                    <div className="bg-white dark:bg-neutral-900">
                      {book.chapters.map((chapter) => (
                        <ChapterRow
                          key={chapter.id}
                          chapter={chapter}
                          selectedVersionType={selectedVersionType}
                          onUpload={handleUpload}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        )}
      </CardContent>
    </Card>
  );
}; 