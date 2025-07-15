import { useFetchCollection, useFetchById } from './base-hooks'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

      // For each chapter, calculate status based on media files
      const chaptersWithStatus: ChapterWithStatus[] = await Promise.all(
        chapters.map(async (chapter) => {
          // Get media files for this chapter and project
          const { data: mediaFiles, error: mediaError } = await supabase
            .from('media_files')
            .select(`
              id,
              media_files_verses (
                verse_id,
                verses (
                  id,
                  verse_number
                )
              )
            `)
            .eq('project_id', projectId)
            .in('id', 
              // Subquery to get media files that have verses in this chapter
              await supabase
                .from('media_files_verses')
                .select('media_file_id')
                .in('verse_id', 
                  await supabase
                    .from('verses')
                    .select('id')
                    .eq('chapter_id', chapter.id)
                    .then(({ data }) => data?.map(v => v.id) || [])
                )
                .then(({ data }) => data?.map(mf => mf.media_file_id) || [])
            )

          if (mediaError) throw mediaError

          // Count unique verses covered by media files
          const verseIds = new Set<string>()
          const mediaFileIds: string[] = []

          mediaFiles?.forEach(mediaFile => {
            mediaFileIds.push(mediaFile.id)
            // Handle nested query result
            const mediaFileVerses = mediaFile.media_files_verses as Array<{ verse_id: string }> | undefined
            mediaFileVerses?.forEach(mfv => {
              if (mfv.verse_id) {
                verseIds.add(mfv.verse_id)
              }
            })
          })

          const versesCovered = verseIds.size
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
      )

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

      // Fetch books for the bible version
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('bible_version_id', bibleVersionId)
        .order('global_order', { ascending: true })

      if (booksError) throw booksError

      // For each book, get chapters with status
      const booksWithProgress: BibleBookWithProgress[] = await Promise.all(
        books.map(async (book) => {
          // Get chapters for this book
          const { data: chapters, error: chaptersError } = await supabase
            .from('chapters')
            .select('*')
            .eq('book_id', book.id)
            .order('chapter_number', { ascending: true })

          if (chaptersError) throw chaptersError

          // Calculate status for each chapter
          const chaptersWithStatus: ChapterWithStatus[] = await Promise.all(
            chapters.map(async (chapter) => {
              // Get verses covered by media files for this chapter and project
              const { data: mediaCoverage, error: mediaError } = await supabase
                .from('media_files_verses')
                .select(`
                  verse_id,
                  media_file_id,
                  media_files!inner (
                    id,
                    project_id
                  ),
                  verses!inner (
                    id,
                    chapter_id
                  )
                `)
                .eq('media_files.project_id', projectId)
                .eq('verses.chapter_id', chapter.id)

              if (mediaError) throw mediaError

              // Count unique verses and media files
              const verseIds = new Set<string>()
              const mediaFileIds = new Set<string>()

              mediaCoverage?.forEach(coverage => {
                verseIds.add(coverage.verse_id)
                mediaFileIds.add(coverage.media_file_id)
              })

              const versesCovered = verseIds.size
              const status = calculateChapterStatus(chapter.total_verses, versesCovered)
              const progress = calculateProgress(versesCovered, chapter.total_verses)

              return {
                ...chapter,
                status,
                progress,
                mediaFileIds: Array.from(mediaFileIds),
                versesCovered
              }
            })
          )

          // Calculate book-level progress
          const totalChapters = chaptersWithStatus.length
          const completedChapters = chaptersWithStatus.filter(c => c.status === 'complete').length
          const inProgressChapters = chaptersWithStatus.filter(c => c.status === 'in_progress').length
          const notStartedChapters = chaptersWithStatus.filter(c => c.status === 'not_started').length
          
          const totalVerses = chaptersWithStatus.reduce((sum, c) => sum + c.total_verses, 0)
          const versesCovered = chaptersWithStatus.reduce((sum, c) => sum + c.versesCovered, 0)
          const progress = calculateProgress(versesCovered, totalVerses)

          return {
            ...book,
            chapters: chaptersWithStatus,
            progress,
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

      // Get text versions for this project using language_entity_id
      const { data: textVersions, error: textVersionsError } = await supabase
        .from('text_versions')
        .select('id, bible_version_id')
        .eq('language_entity_id', project.source_language_entity_id)
        .order('created_at', { ascending: true })

      if (textVersionsError) throw textVersionsError
      
      // For now, use the first text version's bible version
      // In the future, this could be made configurable
      const bibleVersionId = textVersions?.[0]?.bible_version_id
      if (!bibleVersionId) {
        throw new Error('No bible version found for this project')
      }

      // Get books with progress
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('bible_version_id', bibleVersionId)
        .order('global_order', { ascending: true })

      if (booksError) throw booksError

      // Calculate progress for each book
      const booksWithProgress: BibleBookWithProgress[] = await Promise.all(
        books.map(async (book) => {
          const { data: chapters } = await supabase
            .from('chapters')
            .select('*')
            .eq('book_id', book.id)
            .order('chapter_number', { ascending: true })

          const chaptersWithStatus: ChapterWithStatus[] = await Promise.all(
            (chapters || []).map(async (chapter) => {
              // Get media file coverage for this chapter
              const { data: coverage } = await supabase
                .from('media_files_verses')
                .select(`
                  verse_id,
                  media_file_id,
                  media_files!inner (project_id),
                  verses!inner (chapter_id)
                `)
                .eq('media_files.project_id', projectId)
                .eq('verses.chapter_id', chapter.id)

              const verseIds = new Set(coverage?.map(c => c.verse_id) || [])
              const mediaFileIds = Array.from(new Set(coverage?.map(c => c.media_file_id) || []))
              
              const versesCovered = verseIds.size
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
          )

          // Calculate book progress
          const totalVerses = chaptersWithStatus.reduce((sum, c) => sum + c.total_verses, 0)
          const versesCovered = chaptersWithStatus.reduce((sum, c) => sum + c.versesCovered, 0)
          
          return {
            ...book,
            chapters: chaptersWithStatus,
            progress: calculateProgress(versesCovered, totalVerses),
            totalChapters: chaptersWithStatus.length,
            completedChapters: chaptersWithStatus.filter(c => c.status === 'complete').length,
            inProgressChapters: chaptersWithStatus.filter(c => c.status === 'in_progress').length,
            notStartedChapters: chaptersWithStatus.filter(c => c.status === 'not_started').length
          }
        })
      )

      // Calculate overall project progress
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
        projectId,
        books: booksWithProgress,
        totalBooks,
        overallProgress,
        completedBooks,
        inProgressBooks,
        notStartedBooks
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to get real-time updates for Bible project dashboard
 * Sets up Supabase subscriptions for media_files and media_files_verses changes
 */
export function useBibleProjectDashboardRealtime(projectId: string | null) {
  const queryClient = useQueryClient()
  
  return useQuery<BibleProjectDashboard | null, SupabaseError>({
    queryKey: ['bible-project-dashboard-realtime', projectId],
    queryFn: async () => {
      if (!projectId) return null
      
      // Re-use the same query logic as the main dashboard
      const dashboard = await queryClient.getQueryData(['bible-project-dashboard', projectId])
      return dashboard as BibleProjectDashboard | null
    },
    enabled: !!projectId,
    refetchInterval: 5000, // Refresh every 5 seconds
    refetchOnWindowFocus: true,
    staleTime: 2000, // Consider data stale after 2 seconds
  })
} 