import { QueryClient } from '@tanstack/react-query'
import { processQueryError } from './query-error-handler'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Performance optimizations
      staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh longer
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer
      
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry for auth errors (401, 403)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if ([401, 403, 404].includes(status)) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetching
      refetchOnWindowFocus: false, // Prevent excessive refetching
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
      
      // Error handling
      throwOnError: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      
      // Error handling
      throwOnError: false,
      
      // Global mutation error handler
      onError: (error) => {
        console.error('Mutation error:', error);
        // Process error for consistent error handling
        processQueryError(error);
        
        // You can add global error notifications here
        // For example: toast.error(processedError.message);
      },
    },
  },
})

// Global query error handler
queryClient.setQueryDefaults(['projects'], {
  staleTime: 5 * 60 * 1000, // Projects change less frequently
  gcTime: 15 * 60 * 1000,
});

queryClient.setQueryDefaults(['bible-versions'], {
  staleTime: 60 * 60 * 1000, // Bible versions rarely change - 1 hour
  gcTime: 2 * 60 * 60 * 1000, // 2 hours
});

queryClient.setQueryDefaults(['language-entities'], {
  staleTime: 60 * 60 * 1000, // Language entities rarely change - 1 hour  
  gcTime: 2 * 60 * 60 * 1000, // 2 hours
});

queryClient.setQueryDefaults(['regions'], {
  staleTime: 60 * 60 * 1000, // Regions rarely change - 1 hour
  gcTime: 2 * 60 * 60 * 1000, // 2 hours
});

// Prefetch commonly used data
export const prefetchCommonData = async () => {
  try {
    // Only prefetch if not already in cache
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['bible-versions'],
        staleTime: 60 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['language-entities'],
        staleTime: 60 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['regions'],
        staleTime: 60 * 60 * 1000,
      }),
    ]);
  } catch (error) {
    console.warn('Failed to prefetch common data:', error);
  }
};

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