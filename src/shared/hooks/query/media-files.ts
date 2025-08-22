import { useFetchCollection, useFetchById } from './base-hooks'
import { useUpdateRecord } from './base-mutations'
import type { TableRow } from './base-hooks'
import { useQueryClient } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useEffect } from 'react';

export type MediaFile = TableRow<'media_files'>

// Enhanced media file type with verse reference information
export interface MediaFileWithVerseInfo extends Omit<MediaFile, 'remote_path'> {
  filename: string;
  verse_reference: string;  // e.g., "Genesis 3:1-7"
  book_name: string;
  chapter_number: number;
  start_verse_number: number;
  end_verse_number: number;
  book_id: string;
  chapter_id: string;
  start_verse_id: string;
  end_verse_id: string;
  book_global_order: number;
}

// Hook to fetch all media files
export function useMediaFiles() {
  return useFetchCollection('media_files', {
    orderBy: { column: 'created_at', ascending: false }
  })
}

// Hook to fetch a single media file by ID
export function useMediaFile(id: string | null) {
  return useFetchById('media_files', id)
}

// Hook to add optimistic uploads to the media files query
export function useOptimisticMediaFileUpdates() {
  const queryClient = useQueryClient();

  const addOptimisticUploads = (projectId: string, uploads: Array<{
    fileName: string;
    bookName: string;
    chapterNumber: number;
    startVerseNumber: number;
    endVerseNumber: number;
  }>) => {
    queryClient.setQueryData(
      ['media_files_with_verse_info', projectId],
      (oldData: MediaFileWithVerseInfo[] = []) => {
        const optimisticFiles: MediaFileWithVerseInfo[] = uploads.map((upload, index) => ({
          id: `optimistic-${Date.now()}-${index}`,
          audio_version_id: '',
          chapter_id: `optimistic-chapter-${index}`,
          start_verse_id: `optimistic-start-verse-${index}`,
          end_verse_id: `optimistic-end-verse-${index}`,
          check_status: 'pending',
          created_at: new Date().toISOString(),
          created_by: '',
          deleted_at: null,
          duration_seconds: null,
          file_size: null,
          is_bible_audio: true,
          language_entity_id: '',
          media_type: 'audio',
          publish_status: 'pending',
          upload_status: 'pending',
          updated_at: new Date().toISOString(),
          version: 1,
          filename: upload.fileName,
          verse_reference: `${upload.bookName} ${upload.chapterNumber}:${upload.startVerseNumber}-${upload.endVerseNumber}`,
          book_name: upload.bookName,
          chapter_number: upload.chapterNumber,
          start_verse_number: upload.startVerseNumber,
          end_verse_number: upload.endVerseNumber,
          book_id: `optimistic-book-${index}`,
          book_global_order: 999,
        } as MediaFileWithVerseInfo));

        // Add optimistic files to the beginning
        return [...optimisticFiles, ...oldData];
      }
    );
  };

  const removeOptimisticUploads = (projectId: string) => {
    queryClient.setQueryData(
      ['media_files_with_verse_info', projectId],
      (oldData: MediaFileWithVerseInfo[] = []) => {
        // Remove files with optimistic IDs
        return oldData.filter(file => !file.id.startsWith('optimistic-'));
      }
    );
  };

  return {
    addOptimisticUploads,
    removeOptimisticUploads,
  };
}

// Hook to fetch media files by project with enhanced verse information
export function useMediaFilesByProject(projectId: string | null) {
  const queryClient = useQueryClient();

  // Set up real-time subscription for media files updates
  useEffect(() => {
    if (!projectId) return;

    console.log('🔔 Setting up media files real-time subscription for project:', projectId);

    const subscription = supabase
      .channel(`media_files_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'media_files'
        },
        (payload) => {
          console.log('📡 Media file change detected:', payload);
          
          // For INSERT events, we can remove optimistic entries since real data is coming
          if (payload.eventType === 'INSERT') {
            console.log('📡 New media file inserted, removing optimistic entries');
            queryClient.setQueryData(
              ['media_files_with_verse_info', projectId],
              (oldData: MediaFileWithVerseInfo[] = []) => {
                return oldData.filter(file => !file.id.startsWith('optimistic-'));
              }
            );
          }
          
          // Invalidate and refetch the media files query
          queryClient.invalidateQueries({
            queryKey: ['media_files_with_verse_info', projectId]
          });
        }
      )
      .subscribe((status) => {
        console.log('🔔 Media files subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up media files subscription');
      try {
        supabase.removeChannel(subscription);
      } catch (error) {
        console.warn('Failed to remove media files subscription channel:', error);
      }
    };
  }, [projectId, queryClient]);

  return useQuery({
    queryKey: ['media_files_with_verse_info', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // First get audio versions for this project
      const { data: audioVersions, error: audioVersionsError } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      if (audioVersionsError) {
        console.error('Error fetching audio versions:', audioVersionsError);
        throw audioVersionsError;
      }

      if (!audioVersions || audioVersions.length === 0) {
        return []; // No audio versions means no media files for this project
      }

      const audioVersionIds = audioVersions.map(v => v.id);
      
      // OPTIMIZED: Use direct chapter_id join instead of complex verse joins
      const { data, error } = await supabase
        .from('media_files')
        .select(`
          id,
          audio_version_id,
          chapter_id,
          start_verse_id,
          end_verse_id,
          check_status,
          created_at,
          created_by,
          deleted_at,
          duration_seconds,
          file_size,
          is_bible_audio,
          language_entity_id,
          media_type,
          object_key,
          original_filename,
          file_type,
          storage_provider,
          publish_status,
          upload_status,
          updated_at,
          version,
          chapter:chapters!chapter_id(
            id,
            chapter_number,
            book:books!book_id(
              id,
              name,
              global_order
            )
          ),
          start_verse:verses!start_verse_id(
            id,
            verse_number
          ),
          end_verse:verses!end_verse_id(
            id,
            verse_number
          )
        `)
        .in('audio_version_id', audioVersionIds)
        .is('deleted_at', null) // Exclude soft-deleted files
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching media files with verse info:', error);
        throw error;
      }

      // Transform the data to include enhanced verse information
      const enhancedFiles: MediaFileWithVerseInfo[] = (data || []).map(file => {
        // OPTIMIZED: Use direct chapter relationship instead of nested verse.chapter
        const chapter = file.chapter as { 
          id: string; 
          chapter_number: number; 
          book?: { id: string; name: string; global_order: number } 
        };
        const startVerse = file.start_verse as { 
          id: string; 
          verse_number: number; 
        };
        const endVerse = file.end_verse as { 
          id: string; 
          verse_number: number; 
        };
        const book = chapter?.book;

        // Use original filename if available, otherwise generate from verse reference with correct extension
        const fallbackExtension = file.file_type || 'mp3';
        const filename = file.original_filename || `${file.id}.${fallbackExtension}`;

        let verseReference = 'Unknown';
        if (book?.name && chapter?.chapter_number && startVerse?.verse_number) {
          if (startVerse.verse_number === endVerse?.verse_number) {
            verseReference = `${book.name} ${chapter.chapter_number}:${startVerse.verse_number}`;
          } else {
            verseReference = `${book.name} ${chapter.chapter_number}:${startVerse.verse_number}-${endVerse?.verse_number || startVerse.verse_number}`;
          }
        }

        return {
          ...file,
          filename,
          verse_reference: verseReference,
          book_name: book?.name || 'Unknown',
          chapter_number: chapter?.chapter_number || 0,
          start_verse_number: startVerse?.verse_number || 0,
          end_verse_number: endVerse?.verse_number || startVerse?.verse_number || 0,
          book_id: book?.id || '',
          chapter_id: chapter?.id || '',
          start_verse_id: startVerse?.id || '',
          end_verse_id: endVerse?.id || '',
          book_global_order: book?.global_order || 999,
        } as MediaFileWithVerseInfo;
      });

      return enhancedFiles;
    },
    enabled: !!projectId,
  });
}

// Hook to fetch media files by project with server-side pagination and filtering
export function useMediaFilesByProjectPaginated(
  projectId: string | null,
  options: {
    page: number
    pageSize: number
    audioVersionId?: string | null
    bookId?: string | null  
    chapterId?: string | null
    publishStatus?: string | null
    uploadStatus?: string | null
    checkStatus?: string | null
    searchText?: string | null
    sortField?: string | null
    sortDirection?: 'asc' | 'desc' | null
    showDeleted?: boolean
  }
) {
  const queryClient = useQueryClient();

  // Set up real-time subscription for media files updates for paginated query
  useEffect(() => {
    if (!projectId) return;

    console.log('🔔 Setting up media files paginated real-time subscription for project:', projectId);

    const subscription = supabase
      .channel(`media_files_paginated_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'media_files'
        },
        (payload) => {
          console.log('📡 Media file change detected (paginated):', payload);
          
          // Invalidate and refetch the paginated media files query
          // We need to invalidate all queries that start with the base key since options vary
          queryClient.invalidateQueries({
            queryKey: ['media_files_by_project_paginated', projectId]
          });
        }
      )
      .subscribe((status) => {
        console.log('🔔 Media files paginated subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up media files paginated subscription');
      try {
        supabase.removeChannel(subscription);
      } catch (error) {
        console.warn('Failed to remove media files paginated subscription channel:', error);
      }
    };
  }, [projectId, queryClient]);

  return useQuery({
    queryKey: ['media_files_by_project_paginated', projectId, options],
    queryFn: async () => {
      if (!projectId) return { data: [], count: 0 }
      
      // First get audio versions for this project
      const { data: audioVersions, error: audioVersionsError } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      if (audioVersionsError) throw audioVersionsError;
      if (!audioVersions || audioVersions.length === 0) {
        return { data: [], count: 0 };
      }

      const audioVersionIds = audioVersions.map(v => v.id);
      
      // Build the query with proper joins
      let query = supabase
        .from('media_files')
        .select(`
          id,
          audio_version_id,
          chapter_id,
          start_verse_id,
          end_verse_id,
          check_status,
          created_at,
          created_by,
          deleted_at,
          duration_seconds,
          file_size,
          is_bible_audio,
          language_entity_id,
          media_type,
          object_key,
          original_filename,
          file_type,
          storage_provider,
          publish_status,
          upload_status,
          updated_at,
          version,
          chapter:chapters!chapter_id(
            id,
            chapter_number,
            book:books!book_id(
              id,
              name,
              global_order
            )
          ),
          start_verse:verses!start_verse_id(
            id,
            verse_number
          ),
          end_verse:verses!end_verse_id(
            id,
            verse_number
          )
        `, { count: 'exact' })
        .in('audio_version_id', audioVersionIds)
      
      // Apply deleted filter
      if (options.showDeleted) {
        query = query.not('deleted_at', 'is', null)
      } else {
        query = query.is('deleted_at', null)
      }
      
      // Apply filters
      if (options.audioVersionId && options.audioVersionId !== 'all') {
        query = query.eq('audio_version_id', options.audioVersionId)
      }
      
      if (options.bookId && options.bookId !== 'all') {
        // First get chapter IDs for the selected book
        const { data: bookChapters } = await supabase
          .from('chapters')
          .select('id')
          .eq('book_id', options.bookId);
        
        if (bookChapters && bookChapters.length > 0) {
          const chapterIds = bookChapters.map(ch => ch.id);
          query = query.in('chapter_id', chapterIds);
        } else {
          // No chapters for this book, return empty result
          return { data: [], count: 0 };
        }
      }
      
      if (options.chapterId && options.chapterId !== 'all') {
        query = query.eq('chapter_id', options.chapterId)
      }
      
      if (options.publishStatus && options.publishStatus !== 'all') {
        query = query.eq('publish_status', options.publishStatus as 'pending' | 'published' | 'archived')
      }
      
                   if (options.uploadStatus && options.uploadStatus !== 'all') {
        query = query.eq('upload_status', options.uploadStatus as 'pending' | 'uploading' | 'completed' | 'failed')
      }
      
      if (options.checkStatus && options.checkStatus !== 'all') {
        query = query.eq('check_status', options.checkStatus as 'pending' | 'requires_review' | 'approved' | 'rejected')
      }
      
      // Search functionality - search in filenames and verse references
      if (options.searchText && options.searchText.trim()) {
        const searchTerm = options.searchText.trim()
        query = query.ilike('id', `%${searchTerm}%`)
      }
      
      // Apply sorting
      const sortField = options.sortField || 'created_at'
      const sortDirection = options.sortDirection || 'desc'
      
      if (sortField === 'verse_reference') {
        // Sort by start_verse_id for consistent verse reference ordering
        // This works with systematic verse IDs and avoids PostgREST limitations
        query = query.order('start_verse_id', { ascending: sortDirection === 'asc' })
      } else {
        query = query.order(sortField, { ascending: sortDirection === 'asc' })
      }
      
      // Apply pagination
      const startIndex = (options.page - 1) * options.pageSize
      query = query.range(startIndex, startIndex + options.pageSize - 1)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
            // Transform the data to include enhanced verse information (same as original hook)
      const enhancedFiles: MediaFileWithVerseInfo[] = (data || []).map(file => {
        

        const chapter = file.chapter as { 
          id: string; 
          chapter_number: number; 
          book?: { id: string; name: string; global_order: number } 
        };
        const startVerse = file.start_verse as { 
          id: string; 
          verse_number: number; 
        };
        const endVerse = file.end_verse as { 
          id: string; 
          verse_number: number; 
        };
        const book = chapter?.book;

        // Use original filename if available, otherwise generate from verse reference with correct extension
        const fallbackExtension = file.file_type || 'mp3';
        const filename = file.original_filename || `${file.id}.${fallbackExtension}`;

        let verseReference = 'Unknown';
        
        
        if (book?.name && chapter?.chapter_number !== undefined && startVerse?.verse_number !== undefined) {
          if (startVerse.verse_number === endVerse?.verse_number || !endVerse) {
            verseReference = `${book.name} ${chapter.chapter_number}:${startVerse.verse_number}`;
          } else {
            verseReference = `${book.name} ${chapter.chapter_number}:${startVerse.verse_number}-${endVerse.verse_number}`;
          }
        } else {
          // Provide more specific error info
          if (!book?.name) verseReference = 'Unknown Book';
          else if (chapter?.chapter_number === undefined) verseReference = 'Unknown Chapter';
          else if (startVerse?.verse_number === undefined) verseReference = 'Unknown Verse';
        }

        return {
          ...file,
          filename,
          verse_reference: verseReference,
          book_id: book?.id || null,
          book_name: book?.name || null,
          book_global_order: book?.global_order || null,
          chapter_number: chapter?.chapter_number || null,
          start_verse_number: startVerse?.verse_number || null,
          end_verse_number: endVerse?.verse_number || null
        } as MediaFileWithVerseInfo;
      });

      return { 
        data: enhancedFiles, 
        count: count || 0 
      }
    },
    enabled: !!projectId,
  })
}

// Hook to fetch media files by book and chapter
export function useMediaFilesByBookChapter(bookId: string | null, chapterId: string | null) {
  return useFetchCollection('media_files', {
    filters: { 
      book_id: bookId,
      chapter_id: chapterId 
    },
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!bookId && !!chapterId,
  })
}

// Hook to fetch media files by upload status
export function useMediaFilesByStatus(status: string | null) {
  return useFetchCollection('media_files', {
    filters: { upload_status: status },
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!status,
  })
}

// Hook to fetch media files pending community check  
export function useMediaFilesPendingCheck(projectId: string | null) {
  return useQuery({
    queryKey: ['media_files_pending_check', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // First get audio versions for this project
      const { data: audioVersions, error: audioVersionsError } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      if (audioVersionsError) throw audioVersionsError;
      if (!audioVersions || audioVersions.length === 0) return [];

      const audioVersionIds = audioVersions.map(v => v.id);
      
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .in('audio_version_id', audioVersionIds)
        .eq('upload_status', 'completed')
        .eq('check_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

// Hook to fetch media files by user
export function useMediaFilesByUser(userId: string | null) {
  return useFetchCollection('media_files', {
    filters: { uploaded_by: userId },
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!userId,
  })
}

// Mutation hook for updating media file
export function useUpdateMediaFile() {
  return useUpdateRecord('media_files', {
    invalidateQueries: [
      ['media_files'],
      ['media_files_with_verse_info'], // Also invalidate enhanced query
      ['media_files_by_project_paginated'] // Invalidate paginated query
    ]
  })
} 

/**
 * Mutation to update media file check status
 */
export function useUpdateMediaFileStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fileId, status }: { fileId: string; status: 'pending' | 'approved' | 'rejected' | 'requires_review' }) => {
      const { data, error } = await supabase
        .from('media_files')
        .update({ check_status: status })
        .eq('id', fileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch media files - use broader query patterns to catch paginated queries
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_by_project_paginated'] });
    },
  });
}

/**
 * Mutation to batch update media file statuses
 */
export function useBatchUpdateMediaFileStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fileIds, status }: { fileIds: string[]; status: 'pending' | 'approved' | 'rejected' | 'requires_review' }) => {
      const { data, error } = await supabase
        .from('media_files')
        .update({ check_status: status })
        .in('id', fileIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch media files - use broader query patterns to catch paginated queries
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_by_project_paginated'] });
    },
  });
}

/**
 * Mutation to batch update media file publish statuses
 */
export function useBatchUpdateMediaFilePublishStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fileIds, status }: { fileIds: string[]; status: 'pending' | 'published' | 'archived' }) => {
      const { data, error } = await supabase
        .from('media_files')
        .update({ publish_status: status })
        .in('id', fileIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch media files - use broader query patterns to catch paginated queries
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_by_project_paginated'] });
    },
  });
}

/**
 * Mutation to soft delete media files
 */
export function useSoftDeleteMediaFiles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fileIds }: { fileIds: string[] }) => {
      const { data, error } = await supabase
        .from('media_files')
        .update({ 
          deleted_at: new Date().toISOString(),
          publish_status: 'archived' // Auto-change publish status to archived when deleting
        })
        .in('id', fileIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch media files - use broader query patterns to catch paginated queries
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_by_project_paginated'] });
    },
  });
} 

/**
 * Mutation to restore (undelete) media files
 */
export function useRestoreMediaFiles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ fileIds }: { fileIds: string[] }) => {
      const { data, error } = await supabase
        .from('media_files')
        .update({ 
          deleted_at: null,
          publish_status: 'pending' // Auto-change publish status to pending when restoring
        })
        .in('id', fileIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch media files - use broader query patterns to catch paginated queries
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_by_project_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['deleted_media_files'] });
    },
  });
}

/**
 * Hook to fetch deleted media files for recovery
 */
export function useDeletedMediaFilesByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['deleted_media_files', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // First get audio versions for this project
      const { data: audioVersions, error: audioVersionsError } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      if (audioVersionsError) {
        console.error('Error fetching audio versions:', audioVersionsError);
        throw audioVersionsError;
      }

      if (!audioVersions || audioVersions.length === 0) {
        return []; // No audio versions means no media files for this project
      }

      const audioVersionIds = audioVersions.map(v => v.id);
      
      const { data, error } = await supabase
        .from('media_files')
        .select(`
          id,
          audio_version_id,
          chapter_id,
          start_verse_id,
          end_verse_id,
          check_status,
          created_at,
          created_by,
          deleted_at,
          duration_seconds,
          file_size,
          is_bible_audio,
          language_entity_id,
          media_type,
          object_key,
          original_filename,
          file_type,
          storage_provider,
          publish_status,
          upload_status,
          updated_at,
          version,
          chapter:chapters!chapter_id(
            id,
            chapter_number,
            book:books!book_id(
              id,
              name,
              global_order
            )
          ),
          start_verse:verses!start_verse_id(
            id,
            verse_number
          ),
          end_verse:verses!end_verse_id(
            id,
            verse_number
          )
        `)
        .in('audio_version_id', audioVersionIds)
        .not('deleted_at', 'is', null) // Only fetch soft-deleted files
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error('Error fetching deleted media files:', error);
        throw error;
      }

      // Transform the data to include enhanced verse information
      const enhancedFiles: MediaFileWithVerseInfo[] = (data || []).map(file => {
        const chapter = file.chapter as { 
          id: string; 
          chapter_number: number; 
          book?: { id: string; name: string; global_order: number } 
        };
        const startVerse = file.start_verse as { 
          id: string; 
          verse_number: number; 
        };
        const endVerse = file.end_verse as { 
          id: string; 
          verse_number: number; 
        };
        const book = chapter?.book;

        // Use original filename if available, otherwise generate from verse reference with correct extension
        const fallbackExtension = file.file_type || 'mp3';
        const filename = file.original_filename || `${file.id}.${fallbackExtension}`;

        let verseReference = 'Unknown';
        if (book?.name && chapter?.chapter_number && startVerse?.verse_number) {
          if (startVerse.verse_number === endVerse?.verse_number) {
            verseReference = `${book.name} ${chapter.chapter_number}:${startVerse.verse_number}`;
          } else {
            verseReference = `${book.name} ${chapter.chapter_number}:${startVerse.verse_number}-${endVerse?.verse_number || startVerse.verse_number}`;
          }
        }

        return {
          ...file,
          filename,
          verse_reference: verseReference,
          book_name: book?.name || 'Unknown',
          chapter_number: chapter?.chapter_number || 0,
          start_verse_number: startVerse?.verse_number || 0,
          end_verse_number: endVerse?.verse_number || startVerse?.verse_number || 0,
          book_id: book?.id || '',
          chapter_id: chapter?.id || '',
          start_verse_id: startVerse?.id || '',
          end_verse_id: endVerse?.id || '',
          book_global_order: book?.global_order || 999,
        } as MediaFileWithVerseInfo;
      });

      return enhancedFiles;
    },
    enabled: !!projectId,
  });
}

// Hook to fetch verse timestamps for multiple media files
export function useMediaFilesVerseTimestamps(mediaFileIds: string[]) {
  return useQuery({
    queryKey: ['media_files_verses_batch', mediaFileIds],
    queryFn: async () => {
      if (!mediaFileIds.length) return {};
      
      const { data, error } = await supabase
        .from('media_files_verses')
        .select(`
          id,
          media_file_id,
          verse_id,
          start_time_seconds,
          duration_seconds,
          verses!verse_id(
            verse_number
          )
        `)
        .in('media_file_id', mediaFileIds)
        .order('start_time_seconds', { ascending: true });

      if (error) {
        console.error('Error fetching verse timestamps:', error);
        throw error;
      }

      // Group by media_file_id
      const grouped: Record<string, Array<{
        id: string;
        verse_id: string;
        start_time_seconds: number;
        duration_seconds: number;
        verse_number: number;
      }>> = {};

      (data || []).forEach(verse => {
        const verseData = verse.verses as { verse_number: number };
        if (!grouped[verse.media_file_id]) {
          grouped[verse.media_file_id] = [];
        }
        grouped[verse.media_file_id].push({
          id: verse.id,
          verse_id: verse.verse_id,
          start_time_seconds: verse.start_time_seconds,
          duration_seconds: verse.duration_seconds,
          verse_number: verseData?.verse_number || 0,
        });
      });

      return grouped;
    },
    enabled: mediaFileIds.length > 0,
  });
}

/**
 * Hook to bulk insert verse timestamps from CSV import with progress tracking
 * Optimized for large datasets with batching and efficient operations
 */
export function useBulkInsertVerseTimestamps() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (
      verseTimestampsData: Array<{
        media_file_id: string
        verse_id: string
        start_time_seconds: number
        duration_seconds: number
      }>,
      options?: {
        onProgress?: (progress: { completed: number; total: number; phase: string }) => void
        batchSize?: number
      }
    ) => {
      const { onProgress, batchSize = 1000 } = options || {};
      const totalRecords = verseTimestampsData.length;
      
      // Get the current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated to upload verse timestamps');
      }
      
      console.log(`Bulk insert starting for user: ${user.id}`);

      onProgress?.({ completed: 0, total: totalRecords, phase: 'Checking and removing existing records...' });

      // Step 1: More thorough deletion strategy to avoid RLS issues
      const mediaFileIds = [...new Set(verseTimestampsData.map(item => item.media_file_id))];
      const allVerseIds = [...new Set(verseTimestampsData.map(item => item.verse_id))];
      
      console.log(`Starting deletion for ${mediaFileIds.length} media files and ${allVerseIds.length} unique verses`);
      
      // First, check what records exist that we might conflict with
      // Use batching to avoid URL length limits with large datasets
      const existingRecords = [];
      const mediaFileBatchSize = 100; // Batch size for media files
      const verseIdSet = new Set(allVerseIds); // For fast filtering
      
      for (let i = 0; i < mediaFileIds.length; i += mediaFileBatchSize) {
        const mediaFileBatch = mediaFileIds.slice(i, i + mediaFileBatchSize);
        
        // Query by media files only, then filter by verse IDs in memory to avoid URL length issues
        const { data: batchData, error: batchError } = await supabase
          .from('media_files_verses')
          .select('media_file_id, verse_id, created_by')
          .in('media_file_id', mediaFileBatch);
          
        if (batchError) {
          console.error(`Error checking existing records batch ${i / mediaFileBatchSize + 1}:`, batchError);
          throw batchError;
        }
        
        if (batchData) {
          // Filter to only records that match our target verse IDs
          const filteredBatchData = batchData.filter(record => verseIdSet.has(record.verse_id));
          existingRecords.push(...filteredBatchData);
        }
      }
      
      console.log(`Found ${existingRecords.length} existing records to potentially delete`);
      
      if (existingRecords && existingRecords.length > 0) {
        // Filter to only records created by current user
        const userOwnedRecords = existingRecords.filter(record => record.created_by === user.id);
        const otherUsersRecords = existingRecords.filter(record => record.created_by !== user.id);
        
        console.log(`User owns ${userOwnedRecords.length} records, ${otherUsersRecords.length} belong to other users`);
        
        if (otherUsersRecords.length > 0) {
          console.warn('Found records owned by other users that will cause conflicts:', otherUsersRecords.slice(0, 5));
        }
        
        // Delete user's own records in smaller, more targeted batches
        if (userOwnedRecords.length > 0) {
          const deletePromises = [];
          const batchSize = 100; // Smaller batches for more reliable deletion
          
          for (let i = 0; i < userOwnedRecords.length; i += batchSize) {
            const batch = userOwnedRecords.slice(i, i + batchSize);
            const batchMediaFileIds = [...new Set(batch.map(r => r.media_file_id))];
            const batchVerseIds = [...new Set(batch.map(r => r.verse_id))];
            
            const deletePromise = supabase
              .from('media_files_verses')
              .delete()
              .in('media_file_id', batchMediaFileIds)
              .in('verse_id', batchVerseIds)
              .eq('created_by', user.id);

            deletePromises.push(deletePromise);
          }

          const deleteResults = await Promise.all(deletePromises);
          
          for (const result of deleteResults) {
            if (result.error) {
              console.error('Error deleting existing verse timestamps:', result.error);
              throw result.error;
            }
            // Count doesn't work reliably with RLS, so we'll trust the operation succeeded
          }
          
          console.log(`Deletion completed for ${userOwnedRecords.length} user-owned records`);
        }
      }

      onProgress?.({ completed: 0, total: totalRecords, phase: 'Preparing and deduplicating records...' });

      // Step 2: Prepare data with correct created_by for RLS policy compliance
      const rawInsertData = verseTimestampsData.map(item => ({
        media_file_id: item.media_file_id,
        verse_id: item.verse_id,
        start_time_seconds: parseFloat(item.start_time_seconds.toFixed(2)),
        duration_seconds: parseFloat(item.duration_seconds.toFixed(2)),
        created_by: user.id, // Direct use - user.id now equals users.id
      }));

      // Step 2.5: Deduplicate records to avoid unique constraint violations
      // Use a Map to ensure unique (media_file_id, verse_id) combinations
      const deduplicatedMap = new Map<string, typeof rawInsertData[0]>();
      
      for (const item of rawInsertData) {
        const key = `${item.media_file_id}|${item.verse_id}`;
        if (!deduplicatedMap.has(key)) {
          deduplicatedMap.set(key, item);
        }
        // If duplicate found, we keep the first occurrence (could also keep last by removing this condition)
      }
      
      const insertData = Array.from(deduplicatedMap.values());
      
      // Log deduplication results
      if (rawInsertData.length !== insertData.length) {
        console.log(`Deduplication: ${rawInsertData.length} -> ${insertData.length} records (removed ${rawInsertData.length - insertData.length} duplicates)`);
      }

      // Update progress with actual record count after deduplication
      const actualTotalRecords = insertData.length;
      onProgress?.({ completed: 0, total: actualTotalRecords, phase: 'Starting batch insert...' });

      // Step 3: Insert in batches to avoid timeouts and memory issues
      const allResults = [];
      let completed = 0;

      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        
        // Try insert first (fastest option)
        let { data, error } = await supabase
          .from('media_files_verses')
          .insert(batch)
          .select();

        // If insert fails with unique constraint violation, handle individual records
        if (error && error.code === '23505') {
          console.log(`Batch ${Math.floor(i / batchSize) + 1}: Insert failed with constraint violation, trying individual inserts...`);
          
          const successfulInserts = [];
          const skippedRecords = [];
          
          // Try each record individually to identify which ones conflict
          for (const record of batch) {
            try {
              const { data: singleData, error: singleError } = await supabase
                .from('media_files_verses')
                .insert([record])
                .select();
                
              if (singleError) {
                if (singleError.code === '23505') {
                  // Constraint violation - record already exists, skip it
                  console.log(`Skipping duplicate record: ${record.media_file_id}/${record.verse_id}`);
                  skippedRecords.push(record);
                } else {
                  // Other error - this is a real problem
                  throw singleError;
                }
              } else if (singleData) {
                successfulInserts.push(...singleData);
              }
            } catch (recordError) {
              console.error(`Failed to process record ${record.media_file_id}/${record.verse_id}:`, recordError);
              throw recordError;
            }
          }
          
          data = successfulInserts;
          error = null; // Clear the batch error since we handled it
          
          if (skippedRecords.length > 0) {
            console.log(`Batch ${Math.floor(i / batchSize) + 1}: Successfully inserted ${successfulInserts.length} records, skipped ${skippedRecords.length} duplicates`);
          }
        }

        if (error) {
          console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
          throw new Error(`Batch insert failed at record ${i + 1}: ${error.message}`);
        }

        if (data) {
          allResults.push(...data);
        }
        
        completed += batch.length;
        onProgress?.({ 
          completed, 
          total: actualTotalRecords, 
          phase: `Inserting records (${completed}/${actualTotalRecords})...` 
        });
      }

      onProgress?.({ completed: actualTotalRecords, total: actualTotalRecords, phase: 'Import completed!' });

      return allResults;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media_files_verses'] })
      queryClient.invalidateQueries({ queryKey: ['media_files_verses_batch'] })
    },
  })
} 