import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBibleVersions } from '../../../shared/stores/project';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { useAudioVersionsByProject } from '../../../shared/hooks/query/audio-versions';
import { useTextVersionsByProject } from '../../../shared/hooks/query/text-versions';
import { useSelectedBibleVersionId, useSetSelectedBibleVersionId } from '../../../shared/stores/project';
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
  mediaFilesProgress?: number; // Only for audio versions: proportion of chapters with at least one media file
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
  versesProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

export function useBibleProgress() {
  const { selectedProject } = useSelectedProject();
  const bibleVersions = useBibleVersions(); // This is now an array directly
  const { data: audioVersions } = useAudioVersionsByProject(selectedProject?.id || '');
  const { data: textVersions } = useTextVersionsByProject(selectedProject?.id || '');
  
  // Use global bible version selection from project store
  const selectedBibleVersionId = useSelectedBibleVersionId();
  const setSelectedBibleVersionId = useSetSelectedBibleVersionId();

  // State for version selection
  const [selectedVersionType, setSelectedVersionType] = useState<'audio' | 'text'>('audio');
  const [currentVersionId, setCurrentVersionId] = useState<string>('');
  
  // State for detailed verse progress (lazy loaded)
  const [detailedProgressCache, setDetailedProgressCache] = useState<Map<string, Map<string, VerseProgressDetails>>>(new Map());
  const [loadingDetailedProgress, setLoadingDetailedProgress] = useState<Set<string>>(new Set());

  // Stabilize cache update functions
  const updateDetailedProgressCache = useCallback((bookId: string, chapterDetailedProgress: Map<string, VerseProgressDetails>) => {
    setDetailedProgressCache(prev => new Map([...prev, [bookId, chapterDetailedProgress]]));
  }, []);

  const updateLoadingDetailedProgress = useCallback((bookId: string, isLoading: boolean) => {
    setLoadingDetailedProgress(prev => {
      const newSet = new Set(prev);
      if (isLoading) {
        newSet.add(bookId);
      } else {
        newSet.delete(bookId);
      }
      return newSet;
    });
  }, []);

  // Memoize the first available bible version ID to prevent infinite loops
  const firstBibleVersionId = useMemo(() => {
    return bibleVersions && bibleVersions.length > 0 ? bibleVersions[0].id : null;
  }, [bibleVersions]);

  // Auto-select first available bible version if none is selected
  useEffect(() => {
    if (firstBibleVersionId && !selectedBibleVersionId) {
      setSelectedBibleVersionId(firstBibleVersionId);
    }
  }, [firstBibleVersionId, selectedBibleVersionId, setSelectedBibleVersionId]);

  // Auto-select version based on type
  useEffect(() => {
    if (selectedVersionType === 'audio' && audioVersions && audioVersions.length > 0) {
      // Only set if currentVersionId is empty or doesn't exist in the current version type
      const currentVersionExists = audioVersions.some(v => v.id === currentVersionId);
      if (!currentVersionExists) {
        setCurrentVersionId(audioVersions[0].id);
      }
    } else if (selectedVersionType === 'text' && textVersions && textVersions.length > 0) {
      // Only set if currentVersionId is empty or doesn't exist in the current version type  
      const currentVersionExists = textVersions.some(v => v.id === currentVersionId);
      if (!currentVersionExists) {
        setCurrentVersionId(textVersions[0].id);
      }
    }
  }, [selectedVersionType, audioVersions, textVersions, currentVersionId]);

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
    const verseIds = verses.map(v => v.id);

    let coveredVerses = 0;
    const verseRanges: Array<{ start: number; end: number }> = [];

    if (selectedVersionType === 'text') {
      // For text versions: Use efficient query to get verse coverage
      const { data: verseTexts, error: textsError } = await supabase
        .from('verse_texts')
        .select('verse_id, verses!verse_id(verse_number)')
        .eq('text_version_id', currentVersionId)
        .in('verse_id', verseIds)
        .not('verse_text', 'is', null);

      if (textsError) throw textsError;

      const coveredVerseIds = new Set(verseTexts?.map(vt => vt.verse_id) || []);
      coveredVerses = coveredVerseIds.size;

      // Calculate coverage ranges
      const coveredVerseNumbers = verseTexts?.map(vt => {
        const verse = vt.verses as { verse_number: number } | null;
        return verse?.verse_number;
      }).filter((num): num is number => num !== undefined).sort((a, b) => a - b) || [];

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
      // For audio versions: check media_files_verses records that link to media_files in this audio version
      const { data: mediaFilesVerses, error: mediaError } = await supabase
        .from('media_files_verses')
        .select(`
          verse_id,
          verses!verse_id(verse_number),
          media_files!media_file_id(audio_version_id)
        `)
        .in('verse_id', verseIds)
        .eq('media_files.audio_version_id', currentVersionId);

      if (mediaError) throw mediaError;

      const coveredVerseIds = new Set<string>();
      const coveredVerseNumbers = new Set<number>();

      // Process each media_files_verses record
      mediaFilesVerses?.forEach(mfv => {
        const verse = mfv.verses as { verse_number: number } | null;
        if (verse && mfv.verse_id) {
          coveredVerseIds.add(mfv.verse_id);
          coveredVerseNumbers.add(verse.verse_number);
        }
      });

      coveredVerses = coveredVerseIds.size;

      // Calculate coverage ranges from covered verse numbers
      const sortedVerseNumbers = Array.from(coveredVerseNumbers).sort((a, b) => a - b);
      
      if (sortedVerseNumbers.length > 0) {
        let rangeStart = sortedVerseNumbers[0];
        let rangeEnd = sortedVerseNumbers[0];

        for (let i = 1; i < sortedVerseNumbers.length; i++) {
          if (sortedVerseNumbers[i] === rangeEnd + 1) {
            rangeEnd = sortedVerseNumbers[i];
          } else {
            verseRanges.push({ start: rangeStart, end: rangeEnd });
            rangeStart = rangeEnd = sortedVerseNumbers[i];
          }
        }
        verseRanges.push({ start: rangeStart, end: rangeEnd });
      }
    }

    return { totalVerses, coveredVerses, verseRanges };
  };

  // Function to load detailed progress for a specific book
  const loadDetailedProgressForBook = async (bookId: string) => {
    if (loadingDetailedProgress.has(bookId) || detailedProgressCache.has(bookId)) {
      return; // Already loading or loaded
    }

    updateLoadingDetailedProgress(bookId, true);

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
      updateDetailedProgressCache(bookId, chapterDetailedProgress);
    } catch (error) {
      console.error(`Error loading detailed progress for book ${bookId}:`, error);
    } finally {
      updateLoadingDetailedProgress(bookId, false);
    }
  };

  // OPTIMIZED: Calculate progress statistics using efficient counting
  const { data: progressStats, isLoading: statsLoading } = useQuery<ProgressStats>({
    queryKey: ['bible-progress-stats', selectedProject?.id, selectedBibleVersionId, selectedVersionType, currentVersionId],
    queryFn: async () => {
      if (!selectedProject?.id || !selectedBibleVersionId || !currentVersionId) {
        return {
          booksProgress: { completed: 0, total: 0, percentage: 0 },
          chaptersProgress: { completed: 0, total: 0, percentage: 0 },
          versesProgress: { completed: 0, total: 0, percentage: 0 }
        };
      }

      try {
        // Get total chapters and verses count for this bible version
        const { count: totalChapters, error: chaptersCountError } = await supabase
          .from('chapters')
          .select('*, books!inner(*)', { count: 'exact', head: true })
          .eq('books.bible_version_id', selectedBibleVersionId);

        if (chaptersCountError) throw chaptersCountError;

        const { count: totalVerses, error: versesCountError } = await supabase
          .from('verses')
          .select('*, chapters!inner(*, books!inner(*))', { count: 'exact', head: true })
          .eq('chapters.books.bible_version_id', selectedBibleVersionId);

        if (versesCountError) throw versesCountError;

        if (!totalChapters || totalChapters === 0) {
          return {
            booksProgress: { completed: 0, total: 0, percentage: 0 },
            chaptersProgress: { completed: 0, total: 0, percentage: 0 },
            versesProgress: { completed: 0, total: 0, percentage: 0 }
          };
        }

        let completedChapters = 0;
        let completedVerses = 0;
        let chaptersWithContentSet = new Set<string>();

        if (selectedVersionType === 'audio') {
          // Count distinct chapters that have media files
          const { data: chaptersWithMedia } = await supabase
            .from('media_files')
            .select('chapter_id')
            .eq('audio_version_id', currentVersionId)
            .eq('upload_status', 'completed')
            .not('chapter_id', 'is', null);

          // Count unique chapters with media files
          const validChapterIds = chaptersWithMedia
            ?.map(file => file.chapter_id)
            .filter((id): id is string => id !== null) || [];
          chaptersWithContentSet = new Set(validChapterIds);
          completedChapters = chaptersWithContentSet.size;

          // Count verses that have media_files_verses records linking to media_files in this audio version
          const { data: versesWithMedia } = await supabase
            .from('media_files_verses')
            .select(`
              verse_id,
              media_files!media_file_id(audio_version_id)
            `)
            .eq('media_files.audio_version_id', currentVersionId);

          // Count unique verses with media files verses
          const validVerseIds = versesWithMedia
            ?.map(mfv => mfv.verse_id)
            .filter((id): id is string => id !== null) || [];
          completedVerses = new Set(validVerseIds).size;
        } else {
          // For text versions: Use proper aggregated queries to count only COMPLETE chapters
          
          // First, get all chapters for this bible version
          const { data: allChapters } = await supabase
            .from('chapters')
            .select(`
              id,
              total_verses,
              books!inner(bible_version_id)
            `)
            .eq('books.bible_version_id', selectedBibleVersionId);

          if (!allChapters || allChapters.length === 0) {
            completedChapters = 0;
            completedVerses = 0;
          } else {
            // For each chapter, count how many verses have verse_texts
            const chapterCompletionMap = new Map<string, { totalVerses: number; completedVerses: number }>();
            
            // Initialize all chapters with zero completed verses
            allChapters.forEach(chapter => {
              chapterCompletionMap.set(chapter.id, {
                totalVerses: chapter.total_verses,
                completedVerses: 0
              });
            });

            // Get verse completion counts per chapter
            const allChapterIds = allChapters.map(c => c.id);
            const { data: verseTextCounts } = await supabase
              .from('verse_texts')
              .select(`
                verse_id,
                verses!inner(
                  chapter_id
                )
              `)
              .eq('text_version_id', currentVersionId)
              .in('verses.chapter_id', allChapterIds)
              .not('verse_text', 'is', null);

            // Count completed verses per chapter
            verseTextCounts?.forEach(verseText => {
              const verse = verseText.verses as { chapter_id: string } | null;
              if (verse?.chapter_id) {
                const chapterData = chapterCompletionMap.get(verse.chapter_id);
                if (chapterData) {
                  chapterData.completedVerses += 1;
                }
              }
            });

            // Calculate completed chapters (where completedVerses === totalVerses)
            chapterCompletionMap.forEach((data, chapterId) => {
              if (data.completedVerses === data.totalVerses && data.totalVerses > 0) {
                chaptersWithContentSet.add(chapterId);
              }
            });

            completedChapters = chaptersWithContentSet.size;

            // Total completed verses across all chapters
            completedVerses = verseTextCounts?.length || 0;
          }
        }

        // Calculate books progress by checking which books have ALL their chapters complete
        const { data: booksWithChapters } = await supabase
          .from('books')
          .select(`
            id,
            chapters!inner(id)
          `)
          .eq('bible_version_id', selectedBibleVersionId);

        let completedBooks = 0;
        const totalBooks = booksWithChapters?.length || 0;

        booksWithChapters?.forEach(book => {
          const allChaptersComplete = book.chapters.every(chapter => 
            chaptersWithContentSet.has(chapter.id)
          );
          if (allChaptersComplete && book.chapters.length > 0) {
            completedBooks++;
          }
        });

        return {
          booksProgress: {
            completed: completedBooks,
            total: totalBooks,
            percentage: totalBooks > 0 ? (completedBooks / totalBooks) * 100 : 0
          },
          chaptersProgress: {
            completed: completedChapters,
            total: totalChapters,
            percentage: totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0
          },
          versesProgress: {
            completed: completedVerses,
            total: totalVerses || 0,
            percentage: totalVerses && totalVerses > 0 ? (completedVerses / totalVerses) * 100 : 0
          }
        };
      } catch (error) {
        console.error('Error calculating progress stats:', error);
        throw error;
      }
    },
    enabled: !!selectedProject?.id && !!selectedBibleVersionId && !!currentVersionId,
    staleTime: 30000, // Cache for 30 seconds
  });

  // OPTIMIZED: Get detailed book and chapter data with simplified chapter-level tracking
  const { data: bookData, isLoading: bookDataLoading } = useQuery<BookProgress[]>({
    queryKey: ['bible-progress-books', selectedProject?.id, selectedBibleVersionId, selectedVersionType, currentVersionId],
    queryFn: async () => {
      if (!selectedProject?.id || !selectedBibleVersionId || !currentVersionId) {
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
          .eq('bible_version_id', selectedBibleVersionId)
          .order('book_number')
          // No limit needed - there are only 66 books in the Bible

        if (booksError) throw booksError;
        if (!booksWithChapters) return [];

        const allChapterIds = booksWithChapters.flatMap(book => 
          book.chapters.map(chapter => chapter.id)
        );

        const chaptersWithContent: Set<string> = new Set();
        const chapterVerseProgressMap = new Map<string, { totalVerses: number; completedVerses: number }>();
        const chapterMediaFilesMap = new Map<string, number>(); // For audio versions: count of media files per chapter
        const chapterCompleteVersesMap = new Map<string, boolean>(); // For audio versions: whether all verses have media_files_verses

        if (selectedVersionType === 'audio') {
          // Get media files count per chapter
          const { data: mediaFiles } = await supabase
            .from('media_files')
            .select('chapter_id')
            .eq('audio_version_id', currentVersionId)
            .eq('upload_status', 'completed')
            .in('chapter_id', allChapterIds)
            .not('chapter_id', 'is', null);

          // Count media files per chapter
          const mediaFileCountMap = new Map<string, number>();
          mediaFiles?.forEach(file => {
            if (file.chapter_id) {
              const current = mediaFileCountMap.get(file.chapter_id) || 0;
              mediaFileCountMap.set(file.chapter_id, current + 1);
              chaptersWithContent.add(file.chapter_id); // Chapter has at least one media file
            }
          });

          // Store media files count for each chapter
          booksWithChapters.forEach(book => {
            book.chapters.forEach(chapter => {
              chapterMediaFilesMap.set(chapter.id, mediaFileCountMap.get(chapter.id) || 0);
            });
          });

          // Get verse completion data for audio versions (media_files_verses)
          const { data: chapterVerseCompletionData } = await supabase
            .from('chapters')
            .select(`
              id,
              total_verses,
              verses!inner(
                id,
                media_files_verses!left(
                  verse_id,
                  media_files!media_file_id(audio_version_id)
                )
              )
            `)
            .in('id', allChapterIds)
            .eq('verses.media_files_verses.media_files.audio_version_id', currentVersionId);

          // Calculate verse completion for audio chapters
          chapterVerseCompletionData?.forEach(chapter => {
            const completedVerses = chapter.verses?.filter(verse => 
              verse.media_files_verses && verse.media_files_verses.length > 0
            ).length || 0;
            
            chapterVerseProgressMap.set(chapter.id, {
              totalVerses: chapter.total_verses,
              completedVerses
            });

            // Mark chapter as having complete verses if all verses have media_files_verses
            chapterCompleteVersesMap.set(chapter.id, 
              completedVerses === chapter.total_verses && chapter.total_verses > 0
            );
          });

        } else {
          // For text versions: Use the same efficient approach as the statistics calculation
          
          // Initialize progress map for all chapters with zero completion
          booksWithChapters.forEach(book => {
            book.chapters.forEach(chapter => {
              chapterVerseProgressMap.set(chapter.id, {
                totalVerses: chapter.total_verses,
                completedVerses: 0
              });
            });
          });

          // Get verse completion counts for all chapters
          const { data: verseTextCounts } = await supabase
            .from('verse_texts')
            .select(`
              verse_id,
              verses!inner(
                chapter_id
              )
            `)
            .eq('text_version_id', currentVersionId)
            .in('verses.chapter_id', allChapterIds)
            .not('verse_text', 'is', null);

          // Count completed verses per chapter
          verseTextCounts?.forEach(verseText => {
            const verse = verseText.verses as { chapter_id: string } | null;
            if (verse?.chapter_id) {
              const chapterData = chapterVerseProgressMap.get(verse.chapter_id);
              if (chapterData) {
                chapterData.completedVerses += 1;
              }
            }
          });

          // Mark chapters as complete only if ALL verses have texts
          chapterVerseProgressMap.forEach((data, chapterId) => {
            if (data.completedVerses === data.totalVerses && data.totalVerses > 0) {
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
            } else if (selectedVersionType === 'text') {
              // For text versions: use the efficient verse progress data
              const verseProgress = chapterVerseProgressMap.get(chapter.id);
              if (verseProgress && verseProgress.totalVerses > 0) {
                progress = Math.round((verseProgress.completedVerses / verseProgress.totalVerses) * 100);
              } else {
                progress = 0;
              }
            } else {
              // For audio versions: use verse progress (media_files_verses)
              const verseProgress = chapterVerseProgressMap.get(chapter.id);
              if (verseProgress && verseProgress.totalVerses > 0) {
                progress = Math.round((verseProgress.completedVerses / verseProgress.totalVerses) * 100);
              } else {
                progress = 0;
              }
            }
            
            if (progress === 100) status = 'complete';
            else if (progress > 0) status = 'in_progress';

            // For audio versions, include actual media files count
            let mediaFiles: Array<{ id: string; remote_path: string | null; duration_seconds: number | null }> = [];
            if (selectedVersionType === 'audio') {
              const mediaFileCount = chapterMediaFilesMap.get(chapter.id) || 0;
              // Create placeholder objects for the count
              mediaFiles = Array(mediaFileCount).fill(0).map((_, index) => ({
                id: `placeholder-${chapter.id}-${index}`,
                remote_path: null,
                duration_seconds: null
              }));
            }

            // Create verseCoverage for both audio and text versions
            let verseCoverage = chapterDetailedProgress;
            if (!verseCoverage) {
              const verseProgress = chapterVerseProgressMap.get(chapter.id);
              if (verseProgress) {
                verseCoverage = {
                  totalVerses: verseProgress.totalVerses,
                  coveredVerses: verseProgress.completedVerses,
                  verseRanges: [] // We don't calculate ranges in the efficient query, but could be added later
                };
              }
            }

            return {
              id: `${book.id}-${chapter.id}`,
              chapterId: chapter.id,
              chapterNumber: chapter.chapter_number,
              totalVerses: chapter.total_verses,
              progress,
              mediaFiles,
              status,
              verseCoverage
            };
          });

          // Calculate book progress based on completed chapters
          const completedChapters = chapterProgressData.filter(ch => ch.status === 'complete').length;
          const bookProgress = book.chapters.length > 0 
            ? Math.round((completedChapters / book.chapters.length) * 100)
            : 0;

          let bookStatus: BookProgress['status'] = 'not_started';
          if (bookProgress === 100) bookStatus = 'complete';
          else if (bookProgress > 0) bookStatus = 'in_progress';

          // For audio versions, also calculate media files progress (chapters with at least one media file)
          let mediaFilesProgress = 0;
          if (selectedVersionType === 'audio') {
            const chaptersWithMediaFiles = book.chapters.filter(chapter => 
              chapterMediaFilesMap.get(chapter.id) && chapterMediaFilesMap.get(chapter.id)! > 0
            ).length;
            mediaFilesProgress = book.chapters.length > 0 
              ? Math.round((chaptersWithMediaFiles / book.chapters.length) * 100)
              : 0;
          }

          return {
            id: book.id,
            bookId: book.id,
            bookName: book.name,
            totalChapters: book.chapters.length,
            progress: bookProgress, // This represents chapters progress for audio, verse progress for text
            mediaFilesProgress, // Only for audio versions
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
    enabled: !!selectedProject?.id && !!selectedBibleVersionId && !!currentVersionId,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    // State
    selectedVersionType,
    setSelectedVersionType,
    currentVersionId,
    
    // Data
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
    hasData: !!selectedProject && !!selectedBibleVersionId && !!currentVersionId && !statsLoading,
    
    // Functions
    loadDetailedProgressForBook,
    setSelectedAudioVersion,
    setSelectedTextVersion
  };
} 