import { useFetchCollection, useFetchById } from './base-hooks'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import type { TableRow, SupabaseError } from './base-hooks'

export type Book = TableRow<'books'>
export type Chapter = TableRow<'chapters'>
export type Verse = TableRow<'verses'>
export type MediaFile = TableRow<'media_files'>
export type MediaFileVerse = TableRow<'media_files_verses'>

// Enhanced types for dashboard functionality
export interface ChapterWithStatus {
  id: string
  book_id: string
  chapter_number: number
  total_verses: number
  global_order: number | null
  created_at: string | null
  updated_at: string | null
  status: 'complete' | 'in_progress' | 'not_started'
  progress: number // Percentage 0-100
  mediaFileIds: string[]
  versesCovered: number
}

export interface BibleBookWithProgress {
  id: string
  name: string
  book_number: number
  bible_version_id: string
  global_order: number | null
  created_at: string | null
  updated_at: string | null
  chapters: ChapterWithStatus[]
  progress: number // Overall book progress percentage
  totalChapters: number
  completedChapters: number
  inProgressChapters: number
  notStartedChapters: number
}

export interface BibleProjectDashboard {
  projectId: string
  books: BibleBookWithProgress[]
  totalBooks: number
  overallProgress: number
  completedBooks: number
  inProgressBooks: number
  notStartedBooks: number
}

// EXISTING BASIC HOOKS (preserved)
export function useBooks() {
  return useFetchCollection('books', {
    orderBy: { column: 'global_order', ascending: true }
  })
}

export function useBook(id: string | null) {
  return useFetchById('books', id)
}

export function useBooksByBibleVersion(bibleVersionId: string | null) {
  return useFetchCollection('books', {
    filters: { bible_version_id: bibleVersionId },
    orderBy: { column: 'global_order', ascending: true },
    enabled: !!bibleVersionId,
  })
}

export function useChapters() {
  return useFetchCollection('chapters', {
    orderBy: { column: 'chapter_number', ascending: true }
  })
}

export function useChapter(id: string | null) {
  return useFetchById('chapters', id)
}

export function useChaptersByBook(bookId: string | null) {
  return useFetchCollection('chapters', {
    filters: { book_id: bookId },
    orderBy: { column: 'chapter_number', ascending: true },
    enabled: !!bookId,
  })
}

export function useVerses() {
  return useFetchCollection('verses', {
    orderBy: { column: 'verse_number', ascending: true }
  })
}

export function useVerse(id: string | null) {
  return useFetchById('verses', id)
}

export function useVersesByChapter(chapterId: string | null) {
  return useFetchCollection('verses', {
    filters: { chapter_id: chapterId },
    orderBy: { column: 'verse_number', ascending: true },
    enabled: !!chapterId,
  })
}

// NEW ENHANCED HOOKS FOR DASHBOARD

/**
 * Helper function to calculate chapter status based on media files
 */
function calculateChapterStatus(
  totalVerses: number,
  versesCovered: number
): 'complete' | 'in_progress' | 'not_started' {
  if (versesCovered === 0) return 'not_started'
  if (versesCovered === totalVerses) return 'complete'
  return 'in_progress'
}

/**
 * Helper function to calculate progress percentage
 */
function calculateProgress(versesCovered: number, totalVerses: number): number {
  if (totalVerses === 0) return 0
  return Math.round((versesCovered / totalVerses) * 100)
}

/**
 * Hook to fetch chapters with status information for a specific book
 */
export function useChaptersWithStatus(bookId: string | null, projectId: string | null) {
  return useQuery<ChapterWithStatus[], SupabaseError>({
    queryKey: ['chapters-with-status', bookId, projectId],
    queryFn: async () => {
      if (!bookId || !projectId) return []

      // Fetch chapters for the book
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('chapter_number', { ascending: true })

      if (chaptersError) throw chaptersError

      // Get audio versions for this project
      const { data: audioVersions } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      const audioVersionIds = audioVersions?.map(v => v.id) || [];

      // OPTIMIZED: Use direct chapter_id instead of complex junction table queries
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('media_files')
        .select('id, chapter_id')
        .in('audio_version_id', audioVersionIds)
        .in('chapter_id', chapters.map(c => c.id))
        .not('chapter_id', 'is', null)

      if (mediaError) throw mediaError

      // Group media files by chapter for efficient lookup
      const mediaFilesByChapter = new Map<string, string[]>()
      mediaFiles?.forEach(file => {
        if (file.chapter_id) {
          if (!mediaFilesByChapter.has(file.chapter_id)) {
            mediaFilesByChapter.set(file.chapter_id, [])
          }
          mediaFilesByChapter.get(file.chapter_id)!.push(file.id)
        }
      })

      // Calculate status for each chapter - SIMPLIFIED: Chapter-level tracking
      const chaptersWithStatus: ChapterWithStatus[] = chapters.map(chapter => {
        const mediaFileIds = mediaFilesByChapter.get(chapter.id) || []
        const hasMediaFiles = mediaFileIds.length > 0
        
        // OPTIMIZED: Chapter-level progress - if chapter has any media files, consider it complete
        const versesCovered = hasMediaFiles ? chapter.total_verses : 0
        const status = calculateChapterStatus(chapter.total_verses, versesCovered)
        const progress = calculateProgress(versesCovered, chapter.total_verses)

        return {
          ...chapter,
          status,
          progress,
          mediaFileIds,
          versesCovered
        }
      })

      return chaptersWithStatus
    },
    enabled: !!bookId && !!projectId,
  })
}

/**
 * Hook to fetch books with progress information for a project
 */
export function useBooksWithProgress(projectId: string | null, bibleVersionId: string | null) {
  return useQuery<BibleBookWithProgress[], SupabaseError>({
    queryKey: ['books-with-progress', projectId, bibleVersionId],
    queryFn: async () => {
      if (!projectId || !bibleVersionId) return []

      // Get all books for this bible version
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('bible_version_id', bibleVersionId)
        .order('global_order', { ascending: true })
        // No limit needed - there are only 66 books in the Bible

      if (booksError) throw booksError

      // Get audio versions for this project
      const { data: audioVersions } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      const audioVersionIds = audioVersions?.map(v => v.id) || [];

      // Calculate progress for each book
      const booksWithProgress: BibleBookWithProgress[] = await Promise.all(
        books.map(async (book) => {
          // Get chapters for this book
          const { data: chapters, error: chaptersError } = await supabase
            .from('chapters')
            .select('*')
            .eq('book_id', book.id)
            .order('chapter_number', { ascending: true })
            // No limit needed - most books have < 150 chapters

          if (chaptersError) throw chaptersError

          // OPTIMIZED: Get media files directly by chapter_id - no more junction tables!
          const { data: mediaFiles, error: mediaError } = await supabase
            .from('media_files')
            .select('id, chapter_id')
            .in('audio_version_id', audioVersionIds)
            .in('chapter_id', chapters.map(c => c.id))
            .not('chapter_id', 'is', null)
            // Reasonable limit per book - adjust if needed

          if (mediaError) throw mediaError

          // Group media files by chapter
          const mediaFilesByChapter = new Map<string, string[]>()
          mediaFiles?.forEach(file => {
            if (file.chapter_id) {
              if (!mediaFilesByChapter.has(file.chapter_id)) {
                mediaFilesByChapter.set(file.chapter_id, [])
              }
              mediaFilesByChapter.get(file.chapter_id)!.push(file.id)
            }
          })

          // Calculate status for each chapter - SIMPLIFIED: Chapter-level tracking
          const chaptersWithStatus: ChapterWithStatus[] = chapters.map(chapter => {
            const mediaFileIds = mediaFilesByChapter.get(chapter.id) || []
            const hasMediaFiles = mediaFileIds.length > 0
            
            // OPTIMIZED: Chapter-level progress - if chapter has any media files, consider it complete
            const versesCovered = hasMediaFiles ? chapter.total_verses : 0
            const status = calculateChapterStatus(chapter.total_verses, versesCovered)
            const progress = calculateProgress(versesCovered, chapter.total_verses)

            return {
              ...chapter,
              status,
              progress,
              mediaFileIds,
              versesCovered
            }
          })

          // Calculate book progress
          const totalChapters = chaptersWithStatus.length
          const completedChapters = chaptersWithStatus.filter(c => c.status === 'complete').length
          const inProgressChapters = chaptersWithStatus.filter(c => c.status === 'in_progress').length
          const notStartedChapters = chaptersWithStatus.filter(c => c.status === 'not_started').length
          const totalVerses = chaptersWithStatus.reduce((sum, c) => sum + c.total_verses, 0)
          const versesCovered = chaptersWithStatus.reduce((sum, c) => sum + c.versesCovered, 0)
          const bookProgress = calculateProgress(versesCovered, totalVerses)

          return {
            ...book,
            chapters: chaptersWithStatus,
            progress: bookProgress,
            totalChapters,
            completedChapters,
            inProgressChapters,
            notStartedChapters
          }
        })
      )

      return booksWithProgress
    },
    enabled: !!projectId && !!bibleVersionId,
  })
}

/**
 * Hook to get complete Bible project dashboard data
 */
export function useBibleProjectDashboard(projectId: string | null) {
  return useQuery<BibleProjectDashboard | null, SupabaseError>({
    queryKey: ['bible-project-dashboard', projectId],
    queryFn: async () => {
      if (!projectId) return null

      // First get the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, source_language_entity_id, name, description')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      if (!project) throw new Error('Project not found')

      // Get all bible versions (there's only one for now)
      // TODO: In the future, this should be configurable per project via text_versions
      const { data: bibleVersions, error: bibleVersionsError } = await supabase
        .from('bible_versions')
        .select('id')
        .order('created_at', { ascending: true })

      if (bibleVersionsError) throw bibleVersionsError
      
      // Use the first bible version
      const bibleVersionId = bibleVersions?.[0]?.id
      if (!bibleVersionId) {
        throw new Error('No bible versions found in the system')
      }

      // Get books with chapters in a single optimized query
      const { data: booksWithChapters, error: booksError } = await supabase
        .from('books')
        .select(`
          *,
          chapters (
            *
          )
        `)
        .eq('bible_version_id', bibleVersionId)
        .order('global_order', { ascending: true })
        // No limit needed - there are only 66 books in the Bible

      if (booksError) throw booksError

      // Get audio versions for this project
      const { data: audioVersions } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      const audioVersionIds = audioVersions?.map(v => v.id) || [];

      // OPTIMIZED: Get media file coverage directly by chapter using chapter_id
      const { data: mediaFilesByChapter, error: mediaFilesError } = await supabase
        .from('media_files')
        .select(`
          id,
          chapter_id,
          audio_version_id
        `)
        .in('audio_version_id', audioVersionIds)
        .not('chapter_id', 'is', null)
        // Use a reasonable limit - if you have more than 20k media files, consider pagination

      if (mediaFilesError) throw mediaFilesError

      // Group media files by chapter_id for efficient lookup
      const mediaFilesByChapterMap = new Map<string, Set<string>>()
      
      mediaFilesByChapter?.forEach(mediaFile => {
        const chapterId = mediaFile.chapter_id
        
        if (chapterId && mediaFile.audio_version_id && audioVersionIds.includes(mediaFile.audio_version_id)) {
          if (!mediaFilesByChapterMap.has(chapterId)) {
            mediaFilesByChapterMap.set(chapterId, new Set())
          }
          mediaFilesByChapterMap.get(chapterId)!.add(mediaFile.id)
        }
      })

      // Calculate progress for each book efficiently
      const booksWithProgress: BibleBookWithProgress[] = booksWithChapters.map(book => {
        const chaptersWithStatus: ChapterWithStatus[] = (book.chapters || []).map(chapter => {
          // OPTIMIZED: For simplicity, consider a chapter "complete" if it has any media files
          // This can be refined later to check actual verse coverage if needed
          const mediaFileIds = Array.from(mediaFilesByChapterMap.get(chapter.id) || new Set()) as string[]
          const hasMediaFiles = mediaFileIds.length > 0
          
          // Simplified progress calculation: chapters with files are considered complete
          const versesCovered = hasMediaFiles ? chapter.total_verses : 0
          const status = calculateChapterStatus(chapter.total_verses, versesCovered)
          const progress = calculateProgress(versesCovered, chapter.total_verses)

          return {
            ...chapter,
            status,
            progress,
            mediaFileIds,
            versesCovered
          }
        })

        // Calculate book progress
        const totalChapters = chaptersWithStatus.length
        const completedChapters = chaptersWithStatus.filter(c => c.status === 'complete').length
        const inProgressChapters = chaptersWithStatus.filter(c => c.status === 'in_progress').length
        const notStartedChapters = chaptersWithStatus.filter(c => c.status === 'not_started').length
        const totalVerses = chaptersWithStatus.reduce((sum, c) => sum + c.total_verses, 0)
        const versesCovered = chaptersWithStatus.reduce((sum, c) => sum + c.versesCovered, 0)
        const bookProgress = calculateProgress(versesCovered, totalVerses)

        return {
          ...book,
          chapters: chaptersWithStatus,
          progress: bookProgress,
          totalChapters,
          completedChapters,
          inProgressChapters,
          notStartedChapters
        }
      })

      // Calculate overall progress
      const totalBooks = booksWithProgress.length
      const completedBooks = booksWithProgress.filter(b => b.progress === 100).length
      const inProgressBooks = booksWithProgress.filter(b => b.progress > 0 && b.progress < 100).length
      const notStartedBooks = booksWithProgress.filter(b => b.progress === 0).length
      const totalVerses = booksWithProgress.reduce((sum, book) => 
        sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.total_verses, 0), 0
      )
      const versesCovered = booksWithProgress.reduce((sum, book) => 
        sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.versesCovered, 0), 0
      )
      const overallProgress = calculateProgress(versesCovered, totalVerses)

      return {
        projectId: project.id,
        books: booksWithProgress,
        totalBooks,
        overallProgress,
        completedBooks,
        inProgressBooks,
        notStartedBooks
      }
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
  })
}

/**
 * Hook to get real-time updates for Bible project dashboard
 * DEPRECATED: Use regular useBibleProjectDashboard hook instead
 * This polling approach is inefficient and should be replaced with websockets if real-time updates are needed
 */
export function useBibleProjectDashboardRealtime(projectId: string | null) {
  console.warn('useBibleProjectDashboardRealtime is deprecated. Use useBibleProjectDashboard instead.');
  return useBibleProjectDashboard(projectId);
} 

/**
 * Mutation for bulk uploading verse texts via CSV
 */
export function useBulkTextUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      textVersionId, 
      csvData 
    }: { 
      textVersionId: string; 
      csvData: Array<{
        book: string;
        chapter: number;
        verse: number;
        text: string;
      }>; 
    }) => {
      // Transform CSV data to match database structure
      const verseTexts = csvData.map(row => ({
        text_version_id: textVersionId,
        verse_id: row.book, // This would need to be looked up from verses table
        verse_text: row.text,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('verse_texts')
        .upsert(verseTexts, { onConflict: 'text_version_id,book_id,chapter,verse' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate verse texts queries
      queryClient.invalidateQueries({ queryKey: ['verse-texts'] });
      queryClient.invalidateQueries({ queryKey: ['verse-texts-by-project'] });
    },
  });
}

/**
 * Mutation for updating individual verse text
 */
export function useUpdateVerseText() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      text 
    }: { 
      id: string; 
      text: string; 
    }) => {
      const { data, error } = await supabase
        .from('verse_texts')
        .update({ text, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate verse texts queries
      queryClient.invalidateQueries({ queryKey: ['verse-texts'] });
      queryClient.invalidateQueries({ queryKey: ['verse-texts-by-project'] });
    },
  });
}

/**
 * Mutation for deleting verse texts
 */
export function useDeleteVerseTexts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      const { error } = await supabase
        .from('verse_texts')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return { success: true, deletedCount: ids.length };
    },
    onSuccess: () => {
      // Invalidate verse texts queries
      queryClient.invalidateQueries({ queryKey: ['verse-texts'] });
      queryClient.invalidateQueries({ queryKey: ['verse-texts-by-project'] });
    },
  });
} 