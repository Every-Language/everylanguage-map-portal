/**
 * Utility functions for Bible progress calculations and status management
 */

import type { 
  ChapterWithStatus, 
  BibleBookWithProgress, 
  BibleProjectDashboard 
} from '../hooks/query/bible-structure'

export type ChapterStatus = 'complete' | 'in_progress' | 'not_started'
export type BookStatus = 'complete' | 'in_progress' | 'not_started'

/**
 * Calculate chapter status based on verse coverage
 */
export function calculateChapterStatus(
  totalVerses: number,
  versesCovered: number
): ChapterStatus {
  if (totalVerses === 0) return 'not_started'
  if (versesCovered === 0) return 'not_started'
  if (versesCovered >= totalVerses) return 'complete'
  return 'in_progress'
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(covered: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((covered / total) * 100))
}

/**
 * Calculate book status based on chapter statuses
 */
export function calculateBookStatus(chapters: ChapterWithStatus[]): BookStatus {
  if (chapters.length === 0) return 'not_started'
  
  const completedChapters = chapters.filter(c => c.status === 'complete').length
  const inProgressChapters = chapters.filter(c => c.status === 'in_progress').length
  
  if (completedChapters === chapters.length) return 'complete'
  if (completedChapters > 0 || inProgressChapters > 0) return 'in_progress'
  return 'not_started'
}

/**
 * Get progress statistics for a book
 */
export function getBookProgressStats(book: BibleBookWithProgress) {
  return {
    totalChapters: book.chapters.length,
    completedChapters: book.chapters.filter(c => c.status === 'complete').length,
    inProgressChapters: book.chapters.filter(c => c.status === 'in_progress').length,
    notStartedChapters: book.chapters.filter(c => c.status === 'not_started').length,
    totalVerses: book.chapters.reduce((sum, c) => sum + c.total_verses, 0),
    versesCovered: book.chapters.reduce((sum, c) => sum + c.versesCovered, 0),
    progressPercentage: book.progress
  }
}

/**
 * Get progress statistics for the entire project
 */
export function getProjectProgressStats(dashboard: BibleProjectDashboard) {
  const stats = {
    totalBooks: dashboard.books.length,
    completedBooks: 0,
    inProgressBooks: 0,
    notStartedBooks: 0,
    totalChapters: 0,
    completedChapters: 0,
    inProgressChapters: 0,
    notStartedChapters: 0,
    totalVerses: 0,
    versesCovered: 0,
    overallProgress: dashboard.overallProgress
  }

  dashboard.books.forEach(book => {
    // Book-level stats
    if (book.progress === 100) stats.completedBooks++
    else if (book.progress > 0) stats.inProgressBooks++
    else stats.notStartedBooks++

    // Chapter-level stats
    stats.totalChapters += book.totalChapters
    stats.completedChapters += book.completedChapters
    stats.inProgressChapters += book.inProgressChapters
    stats.notStartedChapters += book.notStartedChapters

    // Verse-level stats
    book.chapters.forEach(chapter => {
      stats.totalVerses += chapter.total_verses
      stats.versesCovered += chapter.versesCovered
    })
  })

  return stats
}

/**
 * Sort books by progress status (in-progress first, then not-started, then completed)
 */
export function sortBooksByPriority(books: BibleBookWithProgress[]): BibleBookWithProgress[] {
  return [...books].sort((a, b) => {
    // Priority: in-progress > not-started > completed
    const getPriority = (book: BibleBookWithProgress) => {
      if (book.progress > 0 && book.progress < 100) return 1 // in-progress
      if (book.progress === 0) return 2 // not-started
      return 3 // completed
    }

    const priorityA = getPriority(a)
    const priorityB = getPriority(b)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // If same priority, sort by global_order or book_number
    return (a.global_order || a.book_number) - (b.global_order || b.book_number)
  })
}

/**
 * Filter books by status
 */
export function filterBooksByStatus(
  books: BibleBookWithProgress[], 
  status: BookStatus
): BibleBookWithProgress[] {
  return books.filter(book => {
    switch (status) {
      case 'complete':
        return book.progress === 100
      case 'in_progress':
        return book.progress > 0 && book.progress < 100
      case 'not_started':
        return book.progress === 0
      default:
        return true
    }
  })
}

/**
 * Get the next recommended book to work on
 */
export function getNextRecommendedBook(books: BibleBookWithProgress[]): BibleBookWithProgress | null {
  // First priority: books that are in progress
  const inProgressBooks = filterBooksByStatus(books, 'in_progress')
  if (inProgressBooks.length > 0) {
    return inProgressBooks[0] // Return first in-progress book
  }

  // Second priority: books that haven't been started
  const notStartedBooks = filterBooksByStatus(books, 'not_started')
  if (notStartedBooks.length > 0) {
    // Return the first book by order
    return notStartedBooks.sort((a, b) => 
      (a.global_order || a.book_number) - (b.global_order || b.book_number)
    )[0]
  }

  return null // All books are completed
}

/**
 * Get the next recommended chapter to work on within a book
 */
export function getNextRecommendedChapter(book: BibleBookWithProgress): ChapterWithStatus | null {
  // First priority: chapters that are in progress
  const inProgressChapters = book.chapters.filter(c => c.status === 'in_progress')
  if (inProgressChapters.length > 0) {
    return inProgressChapters[0]
  }

  // Second priority: chapters that haven't been started
  const notStartedChapters = book.chapters.filter(c => c.status === 'not_started')
  if (notStartedChapters.length > 0) {
    // Return the first chapter by number
    return notStartedChapters.sort((a, b) => a.chapter_number - b.chapter_number)[0]
  }

  return null // All chapters are completed
}

/**
 * Calculate estimated completion time based on current progress rate
 */
export function calculateEstimatedCompletion(
  dashboard: BibleProjectDashboard,
  versesPerDay: number = 10 // Default assumption
): {
  remainingVerses: number
  estimatedDays: number
  estimatedCompletionDate: Date | null
} {
  const stats = getProjectProgressStats(dashboard)
  const remainingVerses = stats.totalVerses - stats.versesCovered

  if (remainingVerses === 0) {
    return {
      remainingVerses: 0,
      estimatedDays: 0,
      estimatedCompletionDate: new Date()
    }
  }

  if (versesPerDay <= 0) {
    return {
      remainingVerses,
      estimatedDays: Infinity,
      estimatedCompletionDate: null
    }
  }

  const estimatedDays = Math.ceil(remainingVerses / versesPerDay)
  const estimatedCompletionDate = new Date()
  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDays)

  return {
    remainingVerses,
    estimatedDays,
    estimatedCompletionDate
  }
}

/**
 * Format progress for display
 */
export function formatProgress(progress: number): string {
  return `${progress}%`
}

/**
 * Format status for display
 */
export function formatStatus(status: ChapterStatus | BookStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete'
    case 'in_progress':
      return 'In Progress'
    case 'not_started':
      return 'Not Started'
    default:
      return 'Unknown'
  }
}

/**
 * Get status color for UI components
 */
export function getStatusColor(status: ChapterStatus | BookStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'complete':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200'
      }
    case 'in_progress':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200'
      }
    case 'not_started':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200'
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200'
      }
  }
}

/**
 * Get status indicator color (for dots/badges)
 */
export function getStatusIndicatorColor(status: ChapterStatus | BookStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-green-500'
    case 'in_progress':
      return 'bg-orange-500'
    case 'not_started':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
} 