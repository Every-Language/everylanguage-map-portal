import { useFetchCollection, useFetchById } from './base-hooks'
import { useUpdateRecord } from './base-mutations'
import type { TableRow } from './base-hooks'
import { useQueryClient } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';

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

// Hook to fetch media files by project with enhanced verse information
export function useMediaFilesByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['media_files_with_verse_info', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('media_files')
        .select(`
          *,
          start_verse:verses!start_verse_id(
            id,
            verse_number,
            chapter:chapters!chapter_id(
              id,
              chapter_number,
              book:books!book_id(
                id,
                name
              )
            )
          ),
          end_verse:verses!end_verse_id(
            id,
            verse_number
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null) // Exclude soft-deleted files
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching media files with verse info:', error);
        throw error;
      }

             // Transform the data to include enhanced verse information
      const enhancedFiles: MediaFileWithVerseInfo[] = (data || []).map(file => {
        const startVerse = file.start_verse as { 
          id: string; 
          verse_number: number; 
          chapter?: { 
            id: string; 
            chapter_number: number; 
            book?: { id: string; name: string } 
          } 
        };
        const endVerse = file.end_verse as { id: string; verse_number: number };
        const chapter = startVerse?.chapter;
        const book = chapter?.book;

        const filename = file.local_path?.split('/').pop() || 
                        file.remote_path?.split('/').pop() || 
                        'Unknown';

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
  return useFetchCollection('media_files', {
    filters: { 
      project_id: projectId,
      upload_status: 'completed',
      check_status: 'pending'
    },
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!projectId,
  })
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