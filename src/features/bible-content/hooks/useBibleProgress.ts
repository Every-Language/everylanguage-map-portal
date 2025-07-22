import { useMemo } from 'react';
import { useDataTableState } from '../../../shared/hooks/useDataTableState';
import { useVerseTextsByProject } from '../../../shared/hooks/query/text-versions';
import { useBooks, useChapters } from '../../../shared/hooks/query/bible-structure';

export interface BibleProgressStats {
  totalBooks: number;
  booksWithContent: number;
  totalChapters: number;
  chaptersWithContent: number;
  totalVerses: number;
  versesWithContent: number;
  completionPercentage: number;
}

export interface BookProgress {
  bookId: string;
  bookName: string;
  totalChapters: number;
  chaptersWithContent: number;
  totalVerses: number;
  versesWithContent: number;
  completionPercentage: number;
}

export interface ChapterProgress {
  chapterId: string;
  chapterNumber: number;
  bookName: string;
  totalVerses: number;
  versesWithContent: number;
  completionPercentage: number;
}

export function useBibleProgress(projectId: string | null) {
  // Filter state for progress view
  const tableState = useDataTableState({
    initialFilters: {
      bookId: 'all',
      textVersionId: 'all',
      completionThreshold: 0
    },
    initialSort: {
      field: 'completion',
      direction: 'desc'
    }
  });

  // Data fetching
  const { data: allVerseTexts, isLoading: verseTextsLoading } = useVerseTextsByProject(projectId || '');
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: chapters, isLoading: chaptersLoading } = useChapters();

  // Calculate overall progress
  const overallProgress = useMemo((): BibleProgressStats => {
    if (!allVerseTexts || !books || !chapters) {
      return {
        totalBooks: 0,
        booksWithContent: 0,
        totalChapters: 0,
        chaptersWithContent: 0,
        totalVerses: 0,
        versesWithContent: 0,
        completionPercentage: 0
      };
    }

    const versesWithContent = allVerseTexts.filter(text => 
      text.verse_text && text.verse_text.trim().length > 0
    );

    const chaptersWithContent = new Set(
      versesWithContent.map(text => text.verses?.chapters?.id).filter(Boolean)
    );

    const booksWithContent = new Set(
      versesWithContent.map(text => text.verses?.chapters?.books?.id).filter(Boolean)
    );

    return {
      totalBooks: books.length,
      booksWithContent: booksWithContent.size,
      totalChapters: chapters.length,
      chaptersWithContent: chaptersWithContent.size,
      totalVerses: allVerseTexts.length,
      versesWithContent: versesWithContent.length,
      completionPercentage: allVerseTexts.length > 0 
        ? Math.round((versesWithContent.length / allVerseTexts.length) * 100)
        : 0
    };
  }, [allVerseTexts, books, chapters]);

  // Calculate progress by book
  const bookProgress = useMemo((): BookProgress[] => {
    if (!allVerseTexts || !books) return [];

    return books.map(book => {
      const bookVerses = allVerseTexts.filter(text => 
        text.verses?.chapters?.books?.id === book.id
      );
      
      const versesWithContent = bookVerses.filter(text => 
        text.verse_text && text.verse_text.trim().length > 0
      );

      const bookChapters = new Set(
        bookVerses.map(text => text.verses?.chapters?.id).filter(Boolean)
      );

      const chaptersWithContent = new Set(
        versesWithContent.map(text => text.verses?.chapters?.id).filter(Boolean)
      );

      return {
        bookId: book.id,
        bookName: book.name,
        totalChapters: bookChapters.size,
        chaptersWithContent: chaptersWithContent.size,
        totalVerses: bookVerses.length,
        versesWithContent: versesWithContent.length,
        completionPercentage: bookVerses.length > 0 
          ? Math.round((versesWithContent.length / bookVerses.length) * 100)
          : 0
      };
    }).filter(bookProg => bookProg.totalVerses > 0); // Only include books with verses
  }, [allVerseTexts, books]);

  // Calculate progress by chapter
  const chapterProgress = useMemo((): ChapterProgress[] => {
    if (!allVerseTexts || !chapters) return [];

    return chapters.map(chapter => {
      const chapterVerses = allVerseTexts.filter(text => 
        text.verses?.chapters?.id === chapter.id
      );
      
      const versesWithContent = chapterVerses.filter(text => 
        text.verse_text && text.verse_text.trim().length > 0
      );

      return {
        chapterId: chapter.id,
        chapterNumber: chapter.chapter_number,
        bookName: 'Unknown', // chapters don't have book_name in the schema
        totalVerses: chapterVerses.length,
        versesWithContent: versesWithContent.length,
        completionPercentage: chapterVerses.length > 0 
          ? Math.round((versesWithContent.length / chapterVerses.length) * 100)
          : 0
      };
    }).filter(chapProg => chapProg.totalVerses > 0); // Only include chapters with verses
  }, [allVerseTexts, chapters]);

  // Filter progress data based on current filters
  const filteredBookProgress = useMemo(() => {
    if (!bookProgress) return [];
    
    return bookProgress.filter(book => {
      const matchesBook = tableState.filters.bookId === 'all' || book.bookId === tableState.filters.bookId;
      const meetsThreshold = book.completionPercentage >= (Number(tableState.filters.completionThreshold) || 0);
      
      return matchesBook && meetsThreshold;
    }).sort((a, b) => {
      if (tableState.sortField === 'completion') {
        const comparison = a.completionPercentage - b.completionPercentage;
        return tableState.sortDirection === 'desc' ? -comparison : comparison;
      } else if (tableState.sortField === 'name') {
        const comparison = a.bookName.localeCompare(b.bookName);
        return tableState.sortDirection === 'desc' ? -comparison : comparison;
      }
      return 0;
    });
  }, [bookProgress, tableState.filters, tableState.sortField, tableState.sortDirection]);

  const filteredChapterProgress = useMemo(() => {
    if (!chapterProgress) return [];
    
    return chapterProgress.filter(chapter => {
      const matchesBook = tableState.filters.bookId === 'all' || 
        bookProgress.find(book => book.bookName === chapter.bookName)?.bookId === tableState.filters.bookId;
      const meetsThreshold = chapter.completionPercentage >= (Number(tableState.filters.completionThreshold) || 0);
      
      return matchesBook && meetsThreshold;
    }).sort((a, b) => {
      if (tableState.sortField === 'completion') {
        const comparison = a.completionPercentage - b.completionPercentage;
        return tableState.sortDirection === 'desc' ? -comparison : comparison;
      } else if (tableState.sortField === 'reference') {
        const bookComparison = a.bookName.localeCompare(b.bookName);
        if (bookComparison !== 0) return bookComparison;
        const chapterComparison = a.chapterNumber - b.chapterNumber;
        return tableState.sortDirection === 'desc' ? -chapterComparison : chapterComparison;
      }
      return 0;
    });
  }, [chapterProgress, bookProgress, tableState.filters, tableState.sortField, tableState.sortDirection]);

  return {
    // State
    ...tableState,
    
    // Data
    books,
    overallProgress,
    bookProgress: filteredBookProgress,
    chapterProgress: filteredChapterProgress,
    
    // Loading states
    isLoading: verseTextsLoading || booksLoading || chaptersLoading
  };
} 