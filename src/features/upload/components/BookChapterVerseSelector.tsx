import React, { useCallback, useEffect } from 'react';
import { useSelectedBibleVersionId, useFetchBibleVersions } from '../../../shared/stores/project';
import { 
  useBooksByBibleVersion, 
  useChaptersByBook, 
  useVersesByChapter 
} from '../../../shared/hooks/query/bible-structure';
import { Select, SelectItem } from '../../../shared/design-system';

interface BookChapterVerseSelectorProps {
  selectedBookId: string;
  selectedChapterId: string;
  selectedStartVerseId: string;
  selectedEndVerseId: string;
  onBookChange: (bookId: string) => void;
  onChapterChange: (chapterId: string) => void;
  onStartVerseChange: (verseId: string) => void;
  onEndVerseChange: (verseId: string) => void;
  disabled?: boolean;
  // Add props for detected values from filename parsing
  detectedBook?: string;
  detectedChapter?: number;
  detectedStartVerse?: number;
  detectedEndVerse?: number;
}

export function BookChapterVerseSelector({
  selectedBookId,
  selectedChapterId,
  selectedStartVerseId,
  selectedEndVerseId,
  onBookChange,
  onChapterChange,
  onStartVerseChange,
  onEndVerseChange,
  disabled = false,
  // Add props for detected values from filename parsing
  detectedBook,
  detectedChapter,
  detectedStartVerse,
  detectedEndVerse
}: BookChapterVerseSelectorProps) {
  // Use global bible version selection
  const selectedBibleVersionId = useSelectedBibleVersionId();
  const fetchBibleVersions = useFetchBibleVersions();

  // Ensure bible versions are loaded if not already (run only once)
  useEffect(() => {
    if (!selectedBibleVersionId) {
      fetchBibleVersions();
    }
  }, [selectedBibleVersionId, fetchBibleVersions]);

  // Get books for the bible version
  const { 
    data: books = [], 
    isLoading: loadingBooks 
  } = useBooksByBibleVersion(selectedBibleVersionId || '');

  // Get chapters for selected book
  const { 
    data: chapters = [], 
    isLoading: loadingChapters 
  } = useChaptersByBook(selectedBookId || '');

  // Get verses for selected chapter
  const { 
    data: verses = [], 
    isLoading: loadingVerses 
  } = useVersesByChapter(selectedChapterId || '');

  // Handle changes
  const handleBookChange = useCallback((bookId: string) => {
    onBookChange(bookId);
    // Reset dependent selections
    onChapterChange('');
    onStartVerseChange('');
    onEndVerseChange('');
  }, [onBookChange, onChapterChange, onStartVerseChange, onEndVerseChange]);

  const handleChapterChange = useCallback((chapterId: string) => {
    onChapterChange(chapterId);
    // Reset dependent selections
    onStartVerseChange('');
    onEndVerseChange('');
  }, [onChapterChange, onStartVerseChange, onEndVerseChange]);

  const handleStartVerseChange = useCallback((verseId: string) => {
    onStartVerseChange(verseId);
    // Reset end verse if it's before start verse
    if (selectedEndVerseId) {
      const startIndex = verses.findIndex(v => v.id === verseId);
      const endIndex = verses.findIndex(v => v.id === selectedEndVerseId);
      if (endIndex < startIndex) {
        onEndVerseChange('');
      }
    }
  }, [onStartVerseChange, onEndVerseChange, selectedEndVerseId, verses]);

  const handleEndVerseChange = useCallback((verseId: string) => {
    onEndVerseChange(verseId);
  }, [onEndVerseChange]);

  // Filter end verses to only show those after start verse
  const availableEndVerses = selectedStartVerseId 
    ? verses.slice(verses.findIndex(v => v.id === selectedStartVerseId))
    : verses;

  // Auto-populate selections from detected values when data is loaded
  useEffect(() => {
    // Auto-select book if detected and not already selected
    if (detectedBook && !selectedBookId && books.length > 0) {
      const matchingBook = books.find(book => 
        book.name.toLowerCase() === detectedBook.toLowerCase()
      );
      if (matchingBook) {
        handleBookChange(matchingBook.id);
      }
    }
  }, [detectedBook, selectedBookId, books, handleBookChange]);

  useEffect(() => {
    // Auto-select chapter if detected and not already selected
    if (detectedChapter && selectedBookId && !selectedChapterId && chapters.length > 0) {
      const matchingChapter = chapters.find(chapter => 
        chapter.chapter_number === detectedChapter
      );
      if (matchingChapter) {
        handleChapterChange(matchingChapter.id);
      }
    }
  }, [detectedChapter, selectedBookId, selectedChapterId, chapters, handleChapterChange]);

  useEffect(() => {
    // Auto-select verses if detected and not already selected
    if (detectedStartVerse && selectedChapterId && !selectedStartVerseId && verses.length > 0) {
      const matchingStartVerse = verses.find(verse => 
        verse.verse_number === detectedStartVerse
      );
      if (matchingStartVerse) {
        handleStartVerseChange(matchingStartVerse.id);

        // Also set end verse if detected
        if (detectedEndVerse && !selectedEndVerseId) {
          const matchingEndVerse = verses.find(verse => 
            verse.verse_number === detectedEndVerse
          );
          if (matchingEndVerse) {
            handleEndVerseChange(matchingEndVerse.id);
          }
        }
      }
    }
  }, [detectedStartVerse, detectedEndVerse, selectedChapterId, selectedStartVerseId, selectedEndVerseId, verses, handleStartVerseChange, handleEndVerseChange]);

  const isLoading = loadingBooks || loadingChapters || loadingVerses;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Book Selection */}
      <Select
        label="Book"
        value={selectedBookId || ''}
        onValueChange={handleBookChange}
        disabled={disabled || isLoading}
        placeholder={loadingBooks ? 'Loading books...' : 'Select book'}
        required
      >
        {books.map((book) => (
          <SelectItem key={book.id} value={book.id}>
            {book.name}
          </SelectItem>
        ))}
      </Select>

      {/* Chapter Selection */}
      <Select
        label="Chapter"
        value={selectedChapterId || ''}
        onValueChange={handleChapterChange}
        disabled={disabled || !selectedBookId || loadingChapters}
        placeholder={loadingChapters ? 'Loading chapters...' : 'Select chapter'}
        required
      >
        {chapters.map((chapter) => (
          <SelectItem key={chapter.id} value={chapter.id}>
            Chapter {chapter.chapter_number}
          </SelectItem>
        ))}
      </Select>

      {/* Start Verse Selection */}
      <Select
        label="Start Verse"
        value={selectedStartVerseId || ''}
        onValueChange={handleStartVerseChange}
        disabled={disabled || !selectedChapterId || loadingVerses}
        placeholder={loadingVerses ? 'Loading verses...' : 'Select start verse'}
        required
      >
        {verses.map((verse) => (
          <SelectItem key={verse.id} value={verse.id}>
            Verse {verse.verse_number}
          </SelectItem>
        ))}
      </Select>

      {/* End Verse Selection */}
      <Select
        label="End Verse"
        value={selectedEndVerseId || ''}
        onValueChange={handleEndVerseChange}
        disabled={disabled || !selectedStartVerseId || loadingVerses}
        placeholder={loadingVerses ? 'Loading verses...' : 'Select end verse'}
        required
      >
        {availableEndVerses.map((verse) => (
          <SelectItem key={verse.id} value={verse.id}>
            Verse {verse.verse_number}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
} 