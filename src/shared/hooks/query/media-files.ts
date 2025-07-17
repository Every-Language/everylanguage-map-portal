import { useFetchCollection, useFetchById } from './base-hooks'
import { useUpdateRecord } from './base-mutations'
import type { TableRow } from './base-hooks'
import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';

export type MediaFile = TableRow<'media_files'>

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

// Hook to fetch media files by project
export function useMediaFilesByProject(projectId: string | null) {
  return useFetchCollection('media_files', {
    filters: { project_id: projectId },
    orderBy: { column: 'created_at', ascending: false },
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
      ['media_files']
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
      // Invalidate and refetch media files queries
      queryClient.invalidateQueries({ queryKey: ['media-files'] });
      queryClient.invalidateQueries({ queryKey: ['media-files-by-project'] });
    },
  });
}

/**
 * Mutation to batch update multiple media files' check status
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
      // Invalidate and refetch media files queries
      queryClient.invalidateQueries({ queryKey: ['media-files'] });
      queryClient.invalidateQueries({ queryKey: ['media-files-by-project'] });
    },
  });
} 