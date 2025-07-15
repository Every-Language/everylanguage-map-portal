import { QueryClient } from '@tanstack/react-query'
import { handleGlobalQueryError } from './query-error-handler'

// Default options for all queries
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  retry: 3,
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  refetchOnReconnect: true,
  // Global error handler for queries
  onError: handleGlobalQueryError,
}

// Default options for all mutations
const defaultMutationOptions = {
  retry: 1,
  // Global error handler for mutations
  onError: handleGlobalQueryError,
}

// Create and configure the QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
    mutations: defaultMutationOptions,
  },
})

// Query keys factory for consistent key generation
export const queryKeys = {
  // Base keys
  all: ['app'] as const,
  
  // Users
  users: () => [...queryKeys.all, 'users'] as const,
  user: (id: string) => [...queryKeys.users(), 'user', id] as const,
  
  // Projects
  projects: () => [...queryKeys.all, 'projects'] as const,
  project: (id: string) => [...queryKeys.projects(), 'project', id] as const,
  
  // Language entities
  languageEntities: () => [...queryKeys.all, 'language-entities'] as const,
  languageEntity: (id: string) => [...queryKeys.languageEntities(), 'language-entity', id] as const,
  
  // Regions
  regions: () => [...queryKeys.all, 'regions'] as const,
  region: (id: string) => [...queryKeys.regions(), 'region', id] as const,
  
  // Bible versions
  bibleVersions: () => [...queryKeys.all, 'bible-versions'] as const,
  bibleVersion: (id: string) => [...queryKeys.bibleVersions(), 'bible-version', id] as const,
  
  // Books
  books: () => [...queryKeys.all, 'books'] as const,
  book: (id: string) => [...queryKeys.books(), 'book', id] as const,
  
  // Chapters
  chapters: () => [...queryKeys.all, 'chapters'] as const,
  chapter: (id: string) => [...queryKeys.chapters(), 'chapter', id] as const,
  
  // Verses
  verses: () => [...queryKeys.all, 'verses'] as const,
  verse: (id: string) => [...queryKeys.verses(), 'verse', id] as const,
  
  // Media files
  mediaFiles: () => [...queryKeys.all, 'media-files'] as const,
  mediaFile: (id: string) => [...queryKeys.mediaFiles(), 'media-file', id] as const,
  
  // Text versions
  textVersions: () => [...queryKeys.all, 'text-versions'] as const,
  textVersion: (id: string) => [...queryKeys.textVersions(), 'text-version', id] as const,
  
  // Verse texts
  verseTexts: () => [...queryKeys.all, 'verse-texts'] as const,
  verseText: (id: string) => [...queryKeys.verseTexts(), 'verse-text', id] as const,
} 