import { useState, useEffect } from 'react';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { useBibleVersions } from '../../../shared/hooks/query/bible-versions';
import { useAudioVersionsByProject } from '../../../shared/hooks/query/audio-versions';
import { useTextVersionsByProject } from '../../../shared/hooks/query/text-versions';
import { supabase } from '../../../shared/services/supabase';
import { useQuery } from '@tanstack/react-query';

// Types for progress tracking
export interface ChapterProgress {
  id: string;
  chapterId: string;
  chapterNumber: number;
  totalVerses: number;
  progress: number;
  mediaFiles: Array<{
    id: string;
    remote_path: string | null;
    duration_seconds: number | null;
  }>;
  status: 'complete' | 'in_progress' | 'not_started';
  verseCoverage?: VerseProgressDetails; // Lazy loaded when book is expanded
}

export interface VerseProgressDetails {
  totalVerses: number;
  coveredVerses: number;
  verseRanges: Array<{ start: number; end: number }>;
}

export interface BookProgress {
  id: string;
  bookId: string;
  bookName: string;
  totalChapters: number;
  progress: number;
  chapters: ChapterProgress[];
  status: 'complete' | 'in_progress' | 'not_started';
  detailedProgressLoaded?: boolean;
}

// Statistics for overall progress
export interface ProgressStats {
  booksProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  chaptersProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

export function useBibleProgress() {
  const { selectedProject } = useSelectedProject();
  const { data: bibleVersions } = useBibleVersions();
  const { data: audioVersions } = useAudioVersionsByProject(selectedProject?.id || '');
  const { data: textVersions } = useTextVersionsByProject(selectedProject?.id || '');

  // State for version selection
  const [selectedBibleVersion, setSelectedBibleVersion] = useState<string>('');
  const [selectedVersionType, setSelectedVersionType] = useState<'audio' | 'text'>('audio');
  const [currentVersionId, setCurrentVersionId] = useState<string>('');
  
  // State for detailed verse progress (lazy loaded)
  const [detailedProgressCache, setDetailedProgressCache] = useState<Map<string, Map<string, VerseProgressDetails>>>(new Map());
  const [loadingDetailedProgress, setLoadingDetailedProgress] = useState<Set<string>>(new Set());

  // Auto-select first available bible version
  useEffect(() => {
    if (bibleVersions && bibleVersions.length > 0 && !selectedBibleVersion) {
      setSelectedBibleVersion(bibleVersions[0].id);
    }
  }, [bibleVersions, selectedBibleVersion]);

  // Auto-select version based on type
  useEffect(() => {
    if (selectedVersionType === 'audio' && audioVersions && audioVersions.length > 0) {
      setCurrentVersionId(audioVersions[0].id);
    } else if (selectedVersionType === 'text' && textVersions && textVersions.length > 0) {
      setCurrentVersionId(textVersions[0].id);
    }
  }, [selectedVersionType, audioVersions, textVersions]);

  // Helper functions for version selection
  const setSelectedAudioVersion = (versionId: string) => {
    setCurrentVersionId(versionId);
  };

  const setSelectedTextVersion = (versionId: string) => {
    setCurrentVersionId(versionId);
  };

  // Function to calculate detailed verse progress for a specific chapter
  const calculateDetailedVerseProgress = async (chapterId: string): Promise<VerseProgressDetails> => {
    if (!selectedProject?.id || !currentVersionId) {
      throw new Error('Missing project or version information');
    }

    // Get all verses for this chapter
    const { data: verses, error: versesError } = await supabase
      .from('verses')
      .select('id, verse_number')
      .eq('chapter_id', chapterId)
      .order('verse_number', { ascending: true });

    if (versesError) throw versesError;
    if (!verses) return { totalVerses: 0, coveredVerses: 0, verseRanges: [] };

    const totalVerses = verses.length;
    const verseNumbers = verses.map(v => v.verse_number);
    const verseIds = verses.map(v => v.id);

    let coveredVerses = 0;
    const verseRanges: Array<{ start: number; end: number }> = [];

    if (selectedVersionType === 'text') {
      // For text versions: check if verse_texts exist
      const { data: verseTexts, error: textsError } = await supabase
        .from('verse_texts')
        .select('verse_id')
        .eq('text_version_id', currentVersionId)
        .in('verse_id', verseIds);

      if (textsError) throw textsError;

      const coveredVerseIds = new Set(verseTexts?.map(vt => vt.verse_id) || []);
      coveredVerses = coveredVerseIds.size;

      // Calculate coverage ranges
      const coveredVerseNumbers = verses
        .filter(v => coveredVerseIds.has(v.id))
        .map(v => v.verse_number)
        .sort((a, b) => a - b);

      // Group consecutive verses into ranges
      if (coveredVerseNumbers.length > 0) {
        let rangeStart = coveredVerseNumbers[0];
        let rangeEnd = coveredVerseNumbers[0];

        for (let i = 1; i < coveredVerseNumbers.length; i++) {
          if (coveredVerseNumbers[i] === rangeEnd + 1) {
            rangeEnd = coveredVerseNumbers[i];
          } else {
            verseRanges.push({ start: rangeStart, end: rangeEnd });
            rangeStart = rangeEnd = coveredVerseNumbers[i];
          }
        }
        verseRanges.push({ start: rangeStart, end: rangeEnd });
      }
    } else {
      // For audio versions: check verse coverage in media files
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('media_files')
        .select(`
          start_verse_id,
          end_verse_id,
          start_verse:verses!start_verse_id(verse_number),
          end_verse:verses!end_verse_id(verse_number)
        `)
        .eq('audio_version_id', currentVersionId)
        .eq('chapter_id', chapterId)
        .is('deleted_at', null);

      if (mediaError) throw mediaError;

      const coveredVerseNumbers = new Set<number>();

      // Process each media file's verse range
      mediaFiles?.forEach(file => {
        const startVerse = file.start_verse as { verse_number: number } | null;
        const endVerse = file.end_verse as { verse_number: number } | null;

        if (startVerse && endVerse) {
          for (let v = startVerse.verse_number; v <= endVerse.verse_number; v++) {
            if (verseNumbers.includes(v)) {
              coveredVerseNumbers.add(v);
            }
          }
          verseRanges.push({ 
            start: startVerse.verse_number, 
            end: endVerse.verse_number 
          });
        }
      });

      coveredVerses = coveredVerseNumbers.size;
    }

    return { totalVerses, coveredVerses, verseRanges };
  };

  // Function to load detailed progress for a specific book
  const loadDetailedProgressForBook = async (bookId: string) => {
    if (loadingDetailedProgress.has(bookId) || detailedProgressCache.has(bookId)) {
      return; // Already loading or loaded
    }

    setLoadingDetailedProgress(prev => new Set([...prev, bookId]));

    try {
      // Get all chapters for this book
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('id')
        .eq('book_id', bookId)
        .order('chapter_number', { ascending: true });

      if (chaptersError) throw chaptersError;

      // Calculate detailed progress for each chapter
      const chapterDetailedProgress = new Map<string, VerseProgressDetails>();
      
      if (chapters) {
        await Promise.all(
          chapters.map(async (chapter) => {
            try {
              const details = await calculateDetailedVerseProgress(chapter.id);
              chapterDetailedProgress.set(chapter.id, details);
            } catch (error) {
              console.error(`Error calculating progress for chapter ${chapter.id}:`, error);
              // Set default values on error
              chapterDetailedProgress.set(chapter.id, { 
                totalVerses: 0, 
                coveredVerses: 0, 
                verseRanges: [] 
              });
            }
          })
        );
      }

      // Update cache
      setDetailedProgressCache(prev => new Map([...prev, [bookId, chapterDetailedProgress]]));
    } catch (error) {
      console.error(`Error loading detailed progress for book ${bookId}:`, error);
    } finally {
      setLoadingDetailedProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookId);
        return newSet;
      });
    }
  };

  // OPTIMIZED: Calculate progress statistics using chapter-level tracking
  const { data: progressStats, isLoading: statsLoading } = useQuery<ProgressStats>({
    queryKey: ['bible-progress-stats', selectedProject?.id, selectedBibleVersion, selectedVersionType, currentVersionId],
    queryFn: async () => {
      if (!selectedProject?.id || !selectedBibleVersion || !currentVersionId) {
        return {
          booksProgress: { completed: 0, total: 0, percentage: 0 },
          chaptersProgress: { completed: 0, total: 0, percentage: 0 }
        };
      }

      try {
        // Get all chapters for this bible version
        const { data: allChapters, error: chaptersError } = await supabase
          .from('chapters')
          .select(`
            id,
            books!inner(bible_version_id)
          `)
          .eq('books.bible_version_id', selectedBibleVersion);

        if (chaptersError) throw chaptersError;

        if (!allChapters || allChapters.length === 0) {
          return {
            booksProgress: { completed: 0, total: 0, percentage: 0 },
            chaptersProgress: { completed: 0, total: 0, percentage: 0 }
          };
        }

        const allChapterIds = allChapters.map(c => c.id);
        let completedChapters = 0;
        const totalChapters = allChapterIds.length;

        if (selectedVersionType === 'audio') {
          // OPTIMIZED: Simple chapter-level tracking for audio
          const { data: mediaFiles } = await supabase
            .from('media_files')
            .select('chapter_id')
            .eq('audio_version_id', currentVersionId)
            .eq('upload_status', 'completed')
            .in('chapter_id', allChapterIds)
            .not('chapter_id', 'is', null);

          // Count unique chapters with media files
          const chaptersWithFiles = new Set<string>();
          mediaFiles?.forEach(file => {
            if (file.chapter_id) {
              chaptersWithFiles.add(file.chapter_id);
            }
          });

          completedChapters = chaptersWithFiles.size;
        } else {
          // OPTIMIZED: Simple chapter-level tracking for text
          const { data: verseTexts } = await supabase
            .from('verse_texts')
            .select(`
              verse:verses!verse_id(chapter_id)
            `)
            .eq('text_version_id', currentVersionId)
            .in('verse.chapter_id', allChapterIds)
            .not('verse_text', 'is', null);

          // Count unique chapters with texts
          const chaptersWithTexts = new Set<string>();
          verseTexts?.forEach(text => {
            const chapterId = text.verse?.chapter_id;
            if (chapterId) {
              chaptersWithTexts.add(chapterId);
            }
          });

          completedChapters = chaptersWithTexts.size;
        }

        // SIMPLIFIED: For books, consider a book complete if all its chapters are complete
        // We'll get this from the detailed book data query below
        const completedBooks = 0; // Will be calculated in bookData query

        return {
          booksProgress: {
            completed: completedBooks,
            total: 0, // Will be set from bookData
            percentage: 0 // Will be calculated from bookData
          },
          chaptersProgress: {
            completed: completedChapters,
            total: totalChapters,
            percentage: totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0
          }
        };

      } catch (error) {
        console.error('Error calculating progress stats:', error);
        throw error;
      }
    },
    enabled: !!selectedProject?.id && !!selectedBibleVersion && !!currentVersionId,
    staleTime: 30000, // Cache for 30 seconds
  });

  // OPTIMIZED: Get detailed book and chapter data with simplified chapter-level tracking
  const { data: bookData, isLoading: bookDataLoading } = useQuery<BookProgress[]>({
    queryKey: ['bible-progress-books', selectedProject?.id, selectedBibleVersion, selectedVersionType, currentVersionId],
    queryFn: async () => {
      if (!selectedProject?.id || !selectedBibleVersion || !currentVersionId) {
        return [];
      }

      try {
        // Get all books with their chapters
        const { data: booksWithChapters, error: booksError } = await supabase
          .from('books')
          .select(`
            id,
            name,
            book_number,
            chapters(
              id,
              chapter_number,
              total_verses
            )
          `)
          .eq('bible_version_id', selectedBibleVersion)
          .order('book_number');

        if (booksError) throw booksError;
        if (!booksWithChapters) return [];

        const allChapterIds = booksWithChapters.flatMap(book => 
          book.chapters.map(chapter => chapter.id)
        );

        const chaptersWithContent: Set<string> = new Set();

        if (selectedVersionType === 'audio') {
          // OPTIMIZED: Simple chapter-level tracking for audio
          const { data: mediaFiles } = await supabase
            .from('media_files')
            .select('chapter_id')
            .eq('audio_version_id', currentVersionId)
            .eq('upload_status', 'completed')
            .in('chapter_id', allChapterIds)
            .not('chapter_id', 'is', null);

          mediaFiles?.forEach(file => {
            if (file.chapter_id) {
              chaptersWithContent.add(file.chapter_id);
            }
          });
        } else {
          // OPTIMIZED: Simple chapter-level tracking for text
          const { data: verseTexts } = await supabase
            .from('verse_texts')
            .select(`
              verse:verses!verse_id(chapter_id)
            `)
            .eq('text_version_id', currentVersionId)
            .in('verse.chapter_id', allChapterIds)
            .not('verse_text', 'is', null);

          verseTexts?.forEach(text => {
            const chapterId = text.verse?.chapter_id;
            if (chapterId) {
              chaptersWithContent.add(chapterId);
            }
          });
        }

        // Build book progress data with simplified chapter-level tracking
        const bookProgressData: BookProgress[] = booksWithChapters.map(book => {
          const bookDetailedProgress = detailedProgressCache.get(book.id);
          
          const chapterProgressData: ChapterProgress[] = book.chapters.map(chapter => {
            const chapterDetailedProgress = bookDetailedProgress?.get(chapter.id);
            
            let progress: number;
            let status: ChapterProgress['status'] = 'not_started';
            
            if (chapterDetailedProgress) {
              // Use detailed verse-level progress
              progress = chapterDetailedProgress.totalVerses > 0 
                ? Math.round((chapterDetailedProgress.coveredVerses / chapterDetailedProgress.totalVerses) * 100)
                : 0;
            } else {
              // Fall back to simplified chapter-level progress
              const hasContent = chaptersWithContent.has(chapter.id);
              progress = hasContent ? 100 : 0;
            }
            
            if (progress === 100) status = 'complete';
            else if (progress > 0) status = 'in_progress';

            // For audio files, we can include the media files info
            const mediaFiles = selectedVersionType === 'audio' && progress > 0
              ? [{ id: 'placeholder', remote_path: null, duration_seconds: null }] // Placeholder
              : [];

            return {
              id: `${book.id}-${chapter.id}`,
              chapterId: chapter.id,
              chapterNumber: chapter.chapter_number,
              totalVerses: chapter.total_verses,
              progress,
              mediaFiles,
              status,
              verseCoverage: chapterDetailedProgress
            };
          });

          // Calculate book progress
          const completedChapters = chapterProgressData.filter(ch => ch.status === 'complete').length;
          const bookProgress = book.chapters.length > 0 
            ? Math.round((completedChapters / book.chapters.length) * 100)
            : 0;

          let bookStatus: BookProgress['status'] = 'not_started';
          if (bookProgress === 100) bookStatus = 'complete';
          else if (bookProgress > 0) bookStatus = 'in_progress';

          return {
            id: book.id,
            bookId: book.id,
            bookName: book.name,
            totalChapters: book.chapters.length,
            progress: bookProgress,
            chapters: chapterProgressData,
            status: bookStatus,
            detailedProgressLoaded: !!bookDetailedProgress
          };
        });

        return bookProgressData;

      } catch (error) {
        console.error('Error calculating book data:', error);
        throw error;
      }
    },
    enabled: !!selectedProject?.id && !!selectedBibleVersion && !!currentVersionId,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    // State
    selectedBibleVersion,
    setSelectedBibleVersion,
    selectedVersionType,
    setSelectedVersionType,
    currentVersionId,
    
    // Data
    bibleVersions: bibleVersions || [],
    audioVersions: audioVersions || [],
    textVersions: textVersions || [],
    progressStats,
    bookData: bookData || [],
    
    // Derived state
    availableVersions: selectedVersionType === 'audio' ? audioVersions || [] : textVersions || [],
    
    // Loading states
    isLoading: statsLoading || bookDataLoading,
    statsLoading,
    bookDataLoading,
    
    // Computed
    hasData: !!selectedProject && !!selectedBibleVersion && !!currentVersionId && !statsLoading,
    
    // Functions
    loadDetailedProgressForBook,
    setSelectedAudioVersion,
    setSelectedTextVersion
  };
} 