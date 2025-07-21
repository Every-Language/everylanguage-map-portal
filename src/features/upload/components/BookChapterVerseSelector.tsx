import React, { useEffect } from 'react';
import { Select, SelectItem } from '../../../shared/design-system/components';
import { useBooksByBibleVersion, useChaptersByBook, useVersesByChapter } from '../../../shared/hooks/query/bible-structure';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../shared/services/supabase';

interface BookChapterVerseSelectorProps {
  projectId: string;
  selectedBookId?: string;
  selectedChapterId?: string;
  selectedStartVerseId?: string;
  selectedEndVerseId?: string;
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
  projectId,
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
  // Get the first available bible version as fallback (removing text_versions query)
  const { data: bibleVersionId, isLoading: loadingBibleVersion } = useQuery({
    queryKey: ['default-bible-version'],
    queryFn: async () => {
      // For now, just use the first available bible version
      // TODO: Later we can add logic to get the project's specific bible version
      const { data: bibleVersions, error } = await supabase
        .from('bible_versions')
        .select('id, name')
        .order('name')
        .limit(1);

      if (error) {
        console.error('Error fetching bible versions:', error);
        return null;
      }

      return bibleVersions?.[0]?.id || null;
    },
    enabled: !!projectId,
  });

  // Get books for the bible version
  const { 
    data: books = [], 
    isLoading: loadingBooks 
  } = useBooksByBibleVersion(bibleVersionId || '');

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
  const handleBookChange = (bookId: string) => {
    onBookChange(bookId);
    // Reset dependent selections
    onChapterChange('');
    onStartVerseChange('');
    onEndVerseChange('');
  };

  const handleChapterChange = (chapterId: string) => {
    onChapterChange(chapterId);
    // Reset dependent selections
    onStartVerseChange('');
    onEndVerseChange('');
  };

  const handleStartVerseChange = (verseId: string) => {
    onStartVerseChange(verseId);
    // Reset end verse if it's before start verse
    if (selectedEndVerseId) {
      const startIndex = verses.findIndex(v => v.id === verseId);
      const endIndex = verses.findIndex(v => v.id === selectedEndVerseId);
      if (endIndex < startIndex) {
        onEndVerseChange('');
      }
    }
  };

  const handleEndVerseChange = (verseId: string) => {
    onEndVerseChange(verseId);
  };

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
  }, [detectedBook, selectedBookId, books]);

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
  }, [detectedChapter, selectedBookId, selectedChapterId, chapters]);

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
  }, [detectedStartVerse, detectedEndVerse, selectedChapterId, selectedStartVerseId, selectedEndVerseId, verses]);

  const isLoading = loadingBibleVersion || loadingBooks || loadingChapters || loadingVerses;

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