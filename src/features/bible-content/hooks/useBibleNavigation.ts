import { useState, useCallback, useMemo } from 'react';
import { useBooks, useChapters, useVersesByChapter } from '../../../shared/hooks/query/bible-structure';

export interface BibleNavigation {
  selectedBookId: string | null;
  selectedChapterId: string | null;
  selectedVerseId: string | null;
}

export function useBibleNavigation() {
  const [navigation, setNavigation] = useState<BibleNavigation>({
    selectedBookId: null,
    selectedChapterId: null,
    selectedVerseId: null
  });

  // Data fetching
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: allChapters, isLoading: chaptersLoading } = useChapters();
  const { data: verses, isLoading: versesLoading } = useVersesByChapter(navigation.selectedChapterId);

  // Filter chapters by selected book
  const chapters = useMemo(() => {
    if (!allChapters || !navigation.selectedBookId) return [];
    return allChapters.filter(chapter => chapter.book_id === navigation.selectedBookId);
  }, [allChapters, navigation.selectedBookId]);

  // Actions
  const selectBook = useCallback((bookId: string | null) => {
    setNavigation({
      selectedBookId: bookId,
      selectedChapterId: null,
      selectedVerseId: null
    });
  }, []);

  const selectChapter = useCallback((chapterId: string | null) => {
    setNavigation(prev => ({
      ...prev,
      selectedChapterId: chapterId,
      selectedVerseId: null
    }));
  }, []);

  const selectVerse = useCallback((verseId: string | null) => {
    setNavigation(prev => ({
      ...prev,
      selectedVerseId: verseId
    }));
  }, []);

  const reset = useCallback(() => {
    setNavigation({
      selectedBookId: null,
      selectedChapterId: null,
      selectedVerseId: null
    });
  }, []);

  // Get selected entities
  const selectedBook = useMemo(() => {
    return books?.find(book => book.id === navigation.selectedBookId) || null;
  }, [books, navigation.selectedBookId]);

  const selectedChapter = useMemo(() => {
    return chapters?.find(chapter => chapter.id === navigation.selectedChapterId) || null;
  }, [chapters, navigation.selectedChapterId]);

  const selectedVerse = useMemo(() => {
    return verses?.find(verse => verse.id === navigation.selectedVerseId) || null;
  }, [verses, navigation.selectedVerseId]);

  return {
    // State
    navigation,
    
    // Data
    books: books || [],
    chapters: chapters || [],
    verses: verses || [],
    
    // Selected entities
    selectedBook,
    selectedChapter,
    selectedVerse,
    
    // Actions
    selectBook,
    selectChapter,
    selectVerse,
    reset,
    
    // Loading states
    isLoading: booksLoading || chaptersLoading || versesLoading
  };
} 