import { useFetchCollection, useFetchById } from './base-hooks'
import { useUpdateRecord } from './base-mutations'
import type { TableRow } from './base-hooks'
import { useQueryClient } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useEffect } from 'react';

export type MediaFile = TableRow<'media_files'>

// Enhanced media file type with verse reference information
export interface MediaFileWithVerseInfo extends MediaFile {
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
          remote_path: `optimistic/${upload.fileName}`,
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
      supabase.removeChannel(subscription);
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
          publish_status,
          remote_path,
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

        const filename = file.remote_path?.split('/').pop() || 'Unknown';

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

      // Get the user's ID from the users table (required by RLS policy)
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (dbUserError || !dbUser) {
        throw new Error('User record not found in database');
      }

      // Prepare data with correct created_by for RLS policy compliance
      const insertData = verseTimestampsData.map(item => ({
        media_file_id: item.media_file_id,
        verse_id: item.verse_id,
        start_time_seconds: parseFloat(item.start_time_seconds.toFixed(2)),
        duration_seconds: parseFloat(item.duration_seconds.toFixed(2)),
        created_by: dbUser.id, // Use users.id, not auth.uid()
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