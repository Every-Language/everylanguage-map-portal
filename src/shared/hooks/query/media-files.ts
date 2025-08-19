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

        const filename = file.id || 'Unknown';

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

        const filename = file.id || 'Unknown';

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
      ['media_files_with_verse_info'] // Also invalidate enhanced query
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
      // Invalidate and refetch media files
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
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
      // Invalidate and refetch media files
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
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
      // Invalidate and refetch media files
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
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
        .update({ deleted_at: new Date().toISOString() })
        .in('id', fileIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch media files
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
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
        .update({ deleted_at: null })
        .in('id', fileIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch media files
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
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

        const filename = file.id || 'Unknown';

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
 * Hook to bulk insert verse timestamps from CSV import
 * Uses upsert to overwrite existing records when duplicates are found
 */
export function useBulkInsertVerseTimestamps() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (verseTimestampsData: Array<{
      media_file_id: string
      verse_id: string
      start_time_seconds: number
      duration_seconds: number
    }>) => {
      // Get the current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User must be authenticated to upload verse timestamps');
      }

      // Prepare data with correct created_by for RLS policy compliance
      // Note: After schema migration, user.id equals users.id directly
      const insertData = verseTimestampsData.map(item => ({
        media_file_id: item.media_file_id,
        verse_id: item.verse_id,
        start_time_seconds: parseFloat(item.start_time_seconds.toFixed(2)),
        duration_seconds: parseFloat(item.duration_seconds.toFixed(2)),
        created_by: user.id, // Direct use - user.id now equals users.id
      }))

      // Use upsert to insert new records or update existing ones on conflict
      // This will overwrite existing records when the unique constraint (media_file_id, verse_id) is violated
      const { data, error } = await supabase
        .from('media_files_verses')
        .upsert(insertData, {
          onConflict: 'media_file_id,verse_id',
          ignoreDuplicates: false
        })
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media_files_verses'] })
      queryClient.invalidateQueries({ queryKey: ['media_files_verses_batch'] })
    },
  })
} 