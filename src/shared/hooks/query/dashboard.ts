import { useQuery } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useBibleProjectDashboard } from './bible-structure'
import { useProject } from './projects'
import type { TableRow, SupabaseError } from './base-hooks'

export type User = TableRow<'users'>
export type UserRole = TableRow<'user_roles'>
export type Role = TableRow<'roles'>
export type MediaFile = TableRow<'media_files'>
export type VerseText = TableRow<'verse_texts'>

// Enhanced dashboard data types
export interface RecentActivity {
  mediaFiles: MediaFile[]
  recentUploads: MediaFile[]
  recentTextUpdates: VerseText[]
}

export interface ProjectStats {
  overallProgress: number
  totalVersesCovered: number
  totalVersesInBible: number
  audioFilesCount: number
  textVersionsCount: number
}

export interface BibleVersionProgress {
  version: { id: string; name: string }
  progress: number
  versesCovered: number
  totalVerses: number
}

export interface ProjectMetadata {
  name: string
  description: string
  sourceLanguage: { id: string; name: string } | null
  targetLanguage: { id: string; name: string } | null
  region: { id: string; name: string } | null
  users: Array<{
    user: User
    roles: string[]
    lastActivity: string | null
  }>
  createdAt: string | null
  updatedAt: string | null
}

// Type for text progress data
export interface BookWithTextProgress {
  id: string
  name: string
  chapters: Array<{
    id: string
    chapter_number: number
    total_verses: number
    textProgress: number
    versesWithText: number
  }>
  textProgress: number
  totalVersesWithText: number
  totalVerses: number
}

/**
 * Hook to fetch recent activity for a project
 */
export function useRecentActivity(projectId: string | null, limit: number = 10) {
  return useQuery<RecentActivity, SupabaseError>({
    queryKey: ['project-recent-activity', projectId, limit],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')

      // First get audio versions for this project
      const { data: audioVersions, error: audioVersionsError } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      if (audioVersionsError) throw audioVersionsError;

      let mediaFiles: MediaFile[] = [];
      let recentUploads: MediaFile[] = [];

      if (audioVersions && audioVersions.length > 0) {
        const audioVersionIds = audioVersions.map(v => v.id);

        // OPTIMIZED: Use direct chapter relationship instead of complex joins
        const { data: mediaFilesData, error: mediaError } = await supabase
          .from('media_files')
          .select(`
            *,
            chapter:chapters!chapter_id(
              chapter_number,
              book:books!book_id(name)
            )
          `)
          .in('audio_version_id', audioVersionIds)
          .order('updated_at', { ascending: false })
          .limit(limit)

        if (mediaError) throw mediaError;
        mediaFiles = mediaFilesData || [];

        // OPTIMIZED: Use direct chapter relationship for recent uploads
        const { data: recentUploadsData, error: uploadsError } = await supabase
          .from('media_files')
          .select(`
            *,
            chapter:chapters!chapter_id(
              chapter_number,
              book:books!book_id(name)
            )
          `)
          .in('audio_version_id', audioVersionIds)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (uploadsError) throw uploadsError;
        recentUploads = recentUploadsData || [];
      }

      // Get recent text updates (when verse_texts have project_id in future)
      // For now, filter by project's target language
      const { data: project } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single()

      let recentTextUpdates: VerseText[] = []
      
      if (project?.target_language_entity_id) {
        const { data: textUpdates, error: textError } = await supabase
          .from('verse_texts')
          .select(`
            *,
            text_versions!inner (
              name,
              language_entity_id
            ),
            verses (
              verse_number,
              chapters (
                chapter_number,
                books (name)
              )
            )
          `)
          .eq('text_versions.language_entity_id', project.target_language_entity_id)
          .order('updated_at', { ascending: false })
          .limit(limit)

        if (!textError) {
          recentTextUpdates = textUpdates || []
        }
      }

      return {
        mediaFiles: mediaFiles || [],
        recentUploads: recentUploads || [],
        recentTextUpdates
      }
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook to fetch project statistics
 */
export function useProjectStats(projectId: string | null) {
  const { data: dashboardData } = useBibleProjectDashboard(projectId)

  return useQuery<ProjectStats, SupabaseError>({
    queryKey: ['project-stats', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')

      // Get audio files count
      const { count: audioFilesCount, error: audioCountError } = await supabase
        .from('media_files')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      if (audioCountError) throw audioCountError

      // Get text versions count (approximate based on language)
      const { data: project } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single()

      let textVersionsCount = 0
      if (project?.target_language_entity_id) {
        const { count, error: textCountError } = await supabase
          .from('text_versions')
          .select('*', { count: 'exact', head: true })
          .eq('language_entity_id', project.target_language_entity_id)

        if (!textCountError) {
          textVersionsCount = count || 0
        }
      }

      // Use dashboard data for progress calculations
      const overallProgress = dashboardData?.overallProgress || 0
      const totalVerses = dashboardData?.books?.reduce((sum, book) => 
        sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.total_verses, 0), 0
      ) || 0
      const versesCovered = dashboardData?.books?.reduce((sum, book) => 
        sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.versesCovered, 0), 0
      ) || 0

      return {
        overallProgress,
        totalVersesCovered: versesCovered,
        totalVersesInBible: totalVerses,
        audioFilesCount: audioFilesCount || 0,
        textVersionsCount
      }
    },
    enabled: !!projectId && !!dashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch bible version progress for a project
 */
export function useBibleVersionProgress(projectId: string | null) {
  return useQuery<BibleVersionProgress[], SupabaseError>({
    queryKey: ['bible-version-progress', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')

      // TODO: Update this function to use the new audio_versions pattern
      // This function needs significant refactoring due to the schema change
      // For now, return empty array to prevent crashes
      return [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
  })
}

/**
 * Hook to fetch project users and their roles
 */
export function useProjectUsers(projectId: string | null) {
  return useQuery<ProjectMetadata['users'], SupabaseError>({
    queryKey: ['project-users', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')

      // Get user roles for this project
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          users (
            id,
            auth_uid,
            first_name,
            last_name,
            email,
            phone_number,
            created_at,
            updated_at
          ),
          roles (
            name
          )
        `)
        .eq('context_type', 'project')
        .eq('context_id', projectId)

      if (rolesError) throw rolesError

      // Group by user and collect roles
      const userMap = new Map<string, {
        user: User
        roles: string[]
        lastActivity: string | null
      }>()
      
      userRoles?.forEach((userRole: {
        user_id: string
        users: User
        roles: { name: string }
      }) => {
        const userId = userRole.user_id
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            user: userRole.users,
            roles: [],
            lastActivity: userRole.users?.updated_at || null
          })
        }
        if (userRole.roles) {
          const existingEntry = userMap.get(userId)!
          existingEntry.roles.push(userRole.roles.name)
        }
      })

      return Array.from(userMap.values())
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch complete project metadata
 */
export function useProjectMetadata(projectId: string | null) {
  const { data: project } = useProject(projectId)
  const { data: users } = useProjectUsers(projectId)

  return useQuery<ProjectMetadata, SupabaseError>({
    queryKey: ['project-metadata', projectId],
    queryFn: async () => {
      if (!projectId || !project) throw new Error('Project data is required')

      // Get language entities and region
      let sourceLanguage = null
      let targetLanguage = null
      let region = null

      if (project.source_language_entity_id) {
        const { data } = await supabase
          .from('language_entities')
          .select('id, name')
          .eq('id', project.source_language_entity_id)
          .single()
        sourceLanguage = data
      }

      if (project.target_language_entity_id) {
        const { data } = await supabase
          .from('language_entities')
          .select('id, name')
          .eq('id', project.target_language_entity_id)
          .single()
        targetLanguage = data
      }

      if (project.region_id) {
        const { data } = await supabase
          .from('regions')
          .select('id, name')
          .eq('id', project.region_id)
          .single()
        region = data
      }

      return {
        name: project.name,
        description: project.description || '',
        sourceLanguage,
        targetLanguage,
        region,
        users: users || [],
        createdAt: project.created_at || null,
        updatedAt: project.updated_at || null
      }
    },
    enabled: !!projectId && !!project,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to fetch text progress for a project by bible version
 */
export function useTextProgressByVersion(projectId: string | null, bibleVersionId: string | null) {
  return useQuery<BookWithTextProgress[], SupabaseError>({
    queryKey: ['text-progress-by-version', projectId, bibleVersionId],
    queryFn: async () => {
      if (!projectId || !bibleVersionId) return []

      // Get project's target language
      const { data: project } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single()

      if (!project?.target_language_entity_id) return []

      // Get all books for this bible version
      const { data: books } = await supabase
        .from('books')
        .select(`
          id,
          name,
          chapters (
            id,
            chapter_number,
            total_verses,
            verses (
              id,
              verse_number
            )
          )
        `)
        .eq('bible_version_id', bibleVersionId)
        .order('global_order', { ascending: true })

      if (!books) return []

      // For each book, calculate text progress
      const booksWithTextProgress = await Promise.all(
        books.map(async (book: {
          id: string
          name: string
          chapters: Array<{
            id: string
            chapter_number: number
            total_verses: number
            verses: Array<{ id: string; verse_number: number }>
          }>
        }) => {
          const chaptersWithTextProgress = await Promise.all(
            (book.chapters || []).map(async (chapter) => {
              // Get verse texts for this chapter in the project's target language
              const verseIds = chapter.verses?.map((v) => v.id) || []
              
              if (verseIds.length === 0) {
                return {
                  ...chapter,
                  textProgress: 0,
                  versesWithText: 0
                }
              }

              const { data: verseTexts } = await supabase
                .from('verse_texts')
                .select(`
                  verse_id,
                  text_versions!inner (
                    language_entity_id
                  )
                `)
                .in('verse_id', verseIds)
                .eq('text_versions.language_entity_id', project.target_language_entity_id)
                // No limit needed for verse texts per chapter

              const versesWithText = new Set(verseTexts?.map(vt => vt.verse_id) || []).size
              const textProgress = chapter.total_verses > 0 ? (versesWithText / chapter.total_verses) * 100 : 0

              return {
                ...chapter,
                textProgress: Math.round(textProgress * 100) / 100,
                versesWithText
              }
            })
          )

          // Calculate book-level text progress
          const totalVerses = chaptersWithTextProgress.reduce((sum, ch) => sum + ch.total_verses, 0)
          const versesWithText = chaptersWithTextProgress.reduce((sum, ch) => sum + (ch.versesWithText || 0), 0)
          const bookTextProgress = totalVerses > 0 ? (versesWithText / totalVerses) * 100 : 0

          return {
            ...book,
            chapters: chaptersWithTextProgress,
            textProgress: Math.round(bookTextProgress * 100) / 100,
            totalVersesWithText: versesWithText,
            totalVerses
          }
        })
      )

      return booksWithTextProgress
    },
    enabled: !!projectId && !!bibleVersionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
} 

/**
 * Hook to fetch all available roles
 */
export function useRoles() {
  return useQuery<Role[], SupabaseError>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - roles don't change often
  })
} 

/**
 * Mutation to add a user to a project with a specific role
 */
export function useAddUserToProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, userEmail, roleId }: { 
      projectId: string; 
      userEmail: string; 
      roleId: string; 
    }) => {
      // First, check if user exists or create them
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      // If user doesn't exist, create a pending invitation
      if (!user) {
        // For now, we'll just throw an error since user creation might need special handling
        throw new Error('User not found. Please ensure the user has an account.');
      }

      // Add user role for this project
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role_id: roleId,
          context_type: 'project',
          context_id: projectId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate project users query
      queryClient.invalidateQueries({ queryKey: ['project-users', variables.projectId] });
    },
  });
}

/**
 * Mutation to remove a user from a project
 */
export function useRemoveUserFromProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('context_type', 'project')
        .eq('context_id', projectId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, variables) => {
      // Invalidate project users query
      queryClient.invalidateQueries({ queryKey: ['project-users', variables.projectId] });
    },
  });
}

/**
 * Mutation to update a user's roles in a project
 */
export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, userId, roleIds }: { 
      projectId: string; 
      userId: string; 
      roleIds: string[]; 
    }) => {
      // Remove existing roles for this user in this project
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('context_type', 'project')
        .eq('context_id', projectId);

      // Add new roles
      if (roleIds.length > 0) {
        const { data, error } = await supabase
          .from('user_roles')
          .insert(
            roleIds.map(roleId => ({
              user_id: userId,
              role_id: roleId,
              context_type: 'project',
              context_id: projectId
            }))
          )
          .select();

        if (error) throw error;
        return data;
      }

      return [];
    },
    onSuccess: (_, variables) => {
      // Invalidate project users query
      queryClient.invalidateQueries({ queryKey: ['project-users', variables.projectId] });
    },
  });
}

/**
 * Mutation to perform bulk operations on multiple users
 */
export function useBulkUserOperations() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      userIds, 
      operation, 
      roleId 
    }: { 
      projectId: string; 
      userIds: string[]; 
      operation: 'remove' | 'add_role' | 'remove_role'; 
      roleId?: string; 
    }) => {
      switch (operation) {
        case 'remove': {
          const { error: removeError } = await supabase
            .from('user_roles')
            .delete()
            .in('user_id', userIds)
            .eq('context_type', 'project')
            .eq('context_id', projectId);
          
          if (removeError) throw removeError;
          break;
        }
          
        case 'add_role': {
          if (!roleId) throw new Error('Role ID required for add_role operation');
          
          const { error: addError } = await supabase
            .from('user_roles')
            .insert(
              userIds.map(userId => ({
                user_id: userId,
                role_id: roleId,
                context_type: 'project',
                context_id: projectId
              }))
            );
          
          if (addError) throw addError;
          break;
        }
          
        case 'remove_role': {
          if (!roleId) throw new Error('Role ID required for remove_role operation');
          
          const { error: removeRoleError } = await supabase
            .from('user_roles')
            .delete()
            .in('user_id', userIds)
            .eq('role_id', roleId)
            .eq('context_type', 'project')
            .eq('context_id', projectId);
          
          if (removeRoleError) throw removeRoleError;
          break;
        }
          
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      return { success: true, operation, userCount: userIds.length };
    },
    onSuccess: (_, variables) => {
      // Invalidate project users query
      queryClient.invalidateQueries({ queryKey: ['project-users', variables.projectId] });
    },
  });
} 

/**
 * Hook to calculate overall Bible progress statistics
 */
export function useBibleProgressStats(projectId: string | null, bibleVersionId: string | null) {
  return useQuery<{
    booksProgress: {
      completed: number;
      total: number;
      percentage: number;
    };
    chaptersProgress: {
      completed: number;
      total: number;
      percentage: number;
    };
  }, SupabaseError>({
    queryKey: ['bible-progress-stats', projectId, bibleVersionId],
    queryFn: async () => {
      if (!projectId || !bibleVersionId) throw new Error('Project ID and Bible Version ID are required')

      // Get total books count for this bible version
      const { count: totalBooks, error: booksCountError } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('bible_version_id', bibleVersionId)

      if (booksCountError) throw booksCountError

      // Get total chapters count for this bible version
      const { count: totalChapters, error: chaptersCountError } = await supabase
        .from('chapters')
        .select('*, books!inner(*)', { count: 'exact', head: true })
        .eq('books.bible_version_id', bibleVersionId)

      if (chaptersCountError) throw chaptersCountError

      // Get audio versions that belong to this project
      const { data: audioVersions } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      const audioVersionIds = audioVersions?.map(v => v.id) || [];

      // Count distinct chapters that have media files (much more efficient)
      const { data: chaptersWithMedia, error: mediaCountError } = await supabase
        .from('media_files')
        .select('chapter_id')
        .in('audio_version_id', audioVersionIds)
        .not('chapter_id', 'is', null)
        
      if (mediaCountError) throw mediaCountError

      // Count unique chapters with media files
      const uniqueChaptersWithMedia = new Set(chaptersWithMedia?.map(m => m.chapter_id) || []).size

      // For books completion, we need to check which books have ALL their chapters complete
      // This requires a more complex query, but still more efficient than fetching everything
      const { data: booksWithChapters, error: booksError } = await supabase
        .from('books')
        .select(`
          id,
          chapters!inner(id)
        `)
        .eq('bible_version_id', bibleVersionId)

      if (booksError) throw booksError

      // For each book, check if all its chapters have media files
      let completedBooks = 0
      const chaptersWithMediaSet = new Set(chaptersWithMedia?.map(m => m.chapter_id) || [])
      
      booksWithChapters?.forEach(book => {
        const allChaptersComplete = book.chapters.every(chapter => 
          chaptersWithMediaSet.has(chapter.id)
        )
        if (allChaptersComplete && book.chapters.length > 0) {
          completedBooks++
        }
      })

      return {
        booksProgress: {
          completed: completedBooks,
          total: totalBooks || 0,
          percentage: (totalBooks || 0) > 0 ? (completedBooks / (totalBooks || 1)) * 100 : 0
        },
        chaptersProgress: {
          completed: uniqueChaptersWithMedia,
          total: totalChapters || 0,
          percentage: (totalChapters || 0) > 0 ? (uniqueChaptersWithMedia / (totalChapters || 1)) * 100 : 0
        }
      }
    },
    enabled: !!projectId && !!bibleVersionId,
  })
}

/**
 * Hook to get chapter details for the table view
 */
export function useChapterTableData(projectId: string | null, bibleVersionId: string | null) {
  return useQuery<Array<{
    id: string;
    bookName: string;
    chapterNumber: number;
    totalVerses: number;
    versesCovered: number;
    progressFraction: number;
    mediaFiles: Array<{
      id: string;
      remote_path: string | null;
      duration_seconds: number | null;
    }>;
    status: 'complete' | 'in_progress' | 'not_started';
  }>, SupabaseError>({
    queryKey: ['chapter-table-data', projectId, bibleVersionId],
    queryFn: async () => {
      if (!projectId || !bibleVersionId) throw new Error('Project ID and Bible Version ID are required')

      // Get all chapters with their books
      const { data: chaptersWithBooks, error: chaptersError } = await supabase
        .from('chapters')
        .select(`
          id,
          chapter_number,
          total_verses,
          books!inner (
            id,
            name,
            bible_version_id
          )
        `)
        .eq('books.bible_version_id', bibleVersionId)
        .order('books.global_order', { ascending: true })
        .order('chapter_number', { ascending: true })
        // No limit needed for chapters query

      if (chaptersError) throw chaptersError

      // Get audio versions for this project
      const { data: audioVersions } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      const audioVersionIds = audioVersions?.map(v => v.id) || [];

      // OPTIMIZED: Get media files directly by chapter_id instead of complex joins
      const { data: allMediaFiles, error: mediaFilesError } = await supabase
        .from('media_files')
        .select(`
          id,
          remote_path,
          duration_seconds,
          chapter_id,
          audio_version_id
        `)
        .in('audio_version_id', audioVersionIds)
        .not('chapter_id', 'is', null)
        .order('created_at', { ascending: false })
        // Monitor performance - add limit if this query becomes slow

      if (mediaFilesError) throw mediaFilesError

      // Group media files by chapter
      const mediaFilesByChapter = new Map<string, Array<{
        id: string;
        remote_path: string | null;
        duration_seconds: number | null;
      }>>()

      allMediaFiles?.forEach(mediaFile => {
        const chapterId = mediaFile.chapter_id
        
        if (chapterId && mediaFile.audio_version_id && audioVersionIds.includes(mediaFile.audio_version_id)) {
          if (!mediaFilesByChapter.has(chapterId)) {
            mediaFilesByChapter.set(chapterId, [])
          }
          
          const file = {
            id: mediaFile.id,
            remote_path: mediaFile.remote_path,
            duration_seconds: mediaFile.duration_seconds
          }
          
          // Only add if not already present
          if (!mediaFilesByChapter.get(chapterId)!.some(f => f.id === file.id)) {
            mediaFilesByChapter.get(chapterId)!.push(file)
          }
        }
      })

      // Build table data with simplified progress calculation
      return chaptersWithBooks.map(chapter => {
        const mediaFiles = mediaFilesByChapter.get(chapter.id) || []
        const hasMediaFiles = mediaFiles.length > 0
        
        // OPTIMIZED: Simplified progress - chapters with media files are considered complete
        // This provides much better performance than verse-level tracking
        const versesCovered = hasMediaFiles ? chapter.total_verses : 0
        const progressFraction = chapter.total_verses > 0 ? versesCovered / chapter.total_verses : 0

        let status: 'complete' | 'in_progress' | 'not_started' = 'not_started'
        if (progressFraction >= 1) {
          status = 'complete'
        } else if (progressFraction > 0) {
          status = 'in_progress'
        }

        return {
          id: chapter.id,
          bookName: chapter.books.name,
          chapterNumber: chapter.chapter_number,
          totalVerses: chapter.total_verses,
          versesCovered,
          progressFraction,
          mediaFiles,
          status
        }
      })
    },
    enabled: !!projectId && !!bibleVersionId,
  })
} 