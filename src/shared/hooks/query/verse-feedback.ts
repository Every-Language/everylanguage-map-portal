import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import type { 
  VerseFeedbackInsert, 
  VerseFeedbackUpdate,
  CreateVerseFeedbackData,
  UpdateVerseFeedbackData,
  BulkFeedbackOperation,
  CheckStatus
} from '@/features/community-check/types';

// Hook to fetch all feedback for a specific media file
export function useVerseFeedbackByMediaFile(mediaFileId: string | null) {
  return useQuery({
    queryKey: ['verse_feedback', 'media_file', mediaFileId],
    queryFn: async () => {
      if (!mediaFileId) return null;

      const { data, error } = await supabase
        .from('verse_feedback')
        .select(`
          *,
          verses!verse_id(verse_number),
          created_by_user:users!created_by(email, first_name, last_name),
          updated_by_user:users!updated_by(email, first_name, last_name)
        `)
        .eq('media_files_id', mediaFileId)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching verse feedback:', error);
        throw error;
      }

      return data;
    },
    enabled: !!mediaFileId,
  });
}

// Hook to fetch feedback for a specific verse and media file
export function useVerseFeedbackByVerse(verseId: string | null, mediaFileId: string | null) {
  return useQuery({
    queryKey: ['verse_feedback', 'verse', verseId, mediaFileId],
    queryFn: async () => {
      if (!verseId || !mediaFileId) return null;

      const { data, error } = await supabase
        .from('verse_feedback')
        .select(`
          *,
          created_by_user:users!created_by(email, first_name, last_name),
          updated_by_user:users!updated_by(email, first_name, last_name)
        `)
        .eq('verse_id', verseId)
        .eq('media_files_id', mediaFileId)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching verse feedback:', error);
        throw error;
      }

      return data;
    },
    enabled: !!verseId && !!mediaFileId,
  });
}

// Hook to create new verse feedback
export function useCreateVerseFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedbackData: CreateVerseFeedbackData) => {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User must be authenticated to create feedback');
      }

      // Get the database user using auth_uid
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (dbUserError || !dbUser) {
        throw new Error('User not found in database. Please contact support.');
      }

      // Get the current highest version for this verse
      const { data: existingFeedback, error: versionError } = await supabase
        .from('verse_feedback')
        .select('version')
        .eq('verse_id', feedbackData.verse_id)
        .eq('media_files_id', feedbackData.media_files_id)
        .order('version', { ascending: false })
        .limit(1);

      if (versionError) {
        console.error('Error checking existing feedback versions:', versionError);
        throw versionError;
      }

      const nextVersion = existingFeedback?.length ? existingFeedback[0].version + 1 : 1;

      const insertData: VerseFeedbackInsert = {
        ...feedbackData,
        version: nextVersion,
        created_by: dbUser.id,
        updated_by: dbUser.id,
        actioned: 'pending'
      };

      const { data, error } = await supabase
        .from('verse_feedback')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating verse feedback:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['verse_feedback', 'media_file', data.media_files_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['verse_feedback', 'verse', data.verse_id] 
      });
    },
  });
}

// Hook to update existing verse feedback
export function useUpdateVerseFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: UpdateVerseFeedbackData) => {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User must be authenticated to update feedback');
      }

      // Get the database user using auth_uid
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (dbUserError || !dbUser) {
        throw new Error('User not found in database. Please contact support.');
      }

      const { id, ...updateFields } = updateData;
      
      const updatePayload: VerseFeedbackUpdate = {
        ...updateFields,
        updated_by: dbUser.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('verse_feedback')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating verse feedback:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['verse_feedback', 'media_file', data.media_files_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['verse_feedback', 'verse', data.verse_id] 
      });
    },
  });
}

// Hook to bulk approve multiple verses
export function useBulkApproveVerses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operation: BulkFeedbackOperation) => {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User must be authenticated to bulk approve verses');
      }

      // Get the database user using auth_uid
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (dbUserError || !dbUser) {
        throw new Error('User not found in database. Please contact support.');
      }

      const results = [];
      
      // Process each verse individually to handle version tracking properly
      for (const verseId of operation.verseIds) {
        // Get the current highest version for this verse
        const { data: existingFeedback, error: versionError } = await supabase
          .from('verse_feedback')
          .select('version')
          .eq('verse_id', verseId)
          .eq('media_files_id', operation.mediaFileId)
          .order('version', { ascending: false })
          .limit(1);

        if (versionError) {
          console.error('Error checking existing feedback versions:', versionError);
          throw versionError;
        }

        const nextVersion = existingFeedback?.length ? existingFeedback[0].version + 1 : 1;

        const insertData: VerseFeedbackInsert = {
          media_files_id: operation.mediaFileId,
          verse_id: verseId,
          feedback_type: operation.feedbackType,
          feedback_text: operation.feedbackText || null,
          version: nextVersion,
          created_by: dbUser.id,
          updated_by: dbUser.id,
          actioned: 'pending'
        };

        const { data, error } = await supabase
          .from('verse_feedback')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error(`Error creating feedback for verse ${verseId}:`, error);
          throw error;
        }

        results.push(data);
      }

      return results;
    },
    onSuccess: (data) => {
      // Invalidate and refetch relevant queries
      if (data.length > 0) {
        const mediaFileId = data[0].media_files_id;
        queryClient.invalidateQueries({ 
          queryKey: ['verse_feedback', 'media_file', mediaFileId] 
        });
        
        // Invalidate individual verse queries
        data.forEach(feedback => {
          queryClient.invalidateQueries({ 
            queryKey: ['verse_feedback', 'verse', feedback.verse_id] 
          });
        });
      }
    },
  });
}

// Hook to update media file check status
export function useUpdateMediaFileCheckStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaFileId, newStatus }: { mediaFileId: string; newStatus: CheckStatus }) => {
      const { data, error } = await supabase
        .from('media_files')
        .update({ check_status: newStatus })
        .eq('id', mediaFileId)
        .select()
        .single();

      if (error) {
        console.error('Error updating media file check status:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate media files queries to reflect the status change
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
    },
  });
}

// Hook to bulk update media file check status for multiple files
export function useBulkUpdateMediaFileCheckStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaFileIds, newStatus }: { mediaFileIds: string[]; newStatus: CheckStatus }) => {
      // OPTIMIZED: Single batch update instead of multiple individual updates
      const { data, error } = await supabase
        .from('media_files')
        .update({ check_status: newStatus })
        .in('id', mediaFileIds)
        .select();

      if (error) {
        console.error('Error bulk updating media file check status:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate media files queries to reflect the status changes
      queryClient.invalidateQueries({ queryKey: ['media_files'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_by_project_paginated'] });
    },
  });
}

// Hook to delete verse feedback (for removing specific feedback entries)
export function useDeleteVerseFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedbackId: string) => {
      const { data, error } = await supabase
        .from('verse_feedback')
        .delete()
        .eq('id', feedbackId)
        .select()
        .single();

      if (error) {
        console.error('Error deleting verse feedback:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (deletedFeedback) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['verse_feedback', 'media_file', deletedFeedback.media_files_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['verse_feedback', 'verse', deletedFeedback.verse_id] 
      });
    },
  });
}

// Hook to get feedback summary statistics for a media file
export function useVerseFeedbackSummary(mediaFileId: string | null) {
  return useQuery({
    queryKey: ['verse_feedback', 'summary', mediaFileId],
    queryFn: async () => {
      if (!mediaFileId) return null;

      // Get the latest feedback for each verse (highest version number)
      const { data: allFeedback, error } = await supabase
        .from('verse_feedback')
        .select('verse_id, feedback_type, version')
        .eq('media_files_id', mediaFileId)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching feedback summary:', error);
        throw error;
      }

      // Group by verse_id and take the latest (highest version)
      const latestFeedbackByVerse = allFeedback?.reduce((acc, feedback) => {
        if (!acc[feedback.verse_id] || feedback.version > acc[feedback.verse_id].version) {
          acc[feedback.verse_id] = feedback;
        }
        return acc;
      }, {} as Record<string, typeof allFeedback[0]>);

      const feedbackArray = Object.values(latestFeedbackByVerse || {});
      
      const summary = {
        totalVerses: feedbackArray.length,
        approvedCount: feedbackArray.filter(f => f.feedback_type === 'approved').length,
        changesRequiredCount: feedbackArray.filter(f => f.feedback_type === 'change_required').length,
        completionPercentage: feedbackArray.length > 0 ? 
          Math.round((feedbackArray.length / feedbackArray.length) * 100) : 0
      };

      return summary;
    },
    enabled: !!mediaFileId,
  });
} 