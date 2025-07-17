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

      // Get recent media files by updated_at
      const { data: mediaFiles, error: mediaError } = await supabase
        .from('media_files')
        .select(`
          *,
          books (name),
          chapters (chapter_number)
        `)
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (mediaError) throw mediaError

      // Get recent uploads by created_at
      const { data: recentUploads, error: uploadsError } = await supabase
        .from('media_files')
        .select(`
          *,
          books (name),
          chapters (chapter_number)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (uploadsError) throw uploadsError

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

      // Get all bible versions with their total verses in a single optimized query
      const { data: bibleVersionsWithData, error: versionsError } = await supabase
        .from('bible_versions')
        .select(`
          id, 
          name,
          books (
            id,
            chapters (
              id,
              total_verses
            )
          )
        `)
        .order('name', { ascending: true })

      if (versionsError) throw versionsError

      // Get all covered verses for this project in a single query
      const { data: allCoverage, error: coverageError } = await supabase
        .from('media_files_verses')
        .select(`
          verse_id,
          media_files!inner (project_id),
          verses!inner (
            chapters!inner (
              books!inner (bible_version_id)
            )
          )
        `)
        .eq('media_files.project_id', projectId)

      if (coverageError) throw coverageError

      // Process the data efficiently
      const progressData = (bibleVersionsWithData || []).map((version) => {
        // Calculate total verses for this version
        const totalVerses = version.books?.reduce((sum: number, book: { chapters: Array<{ id: string; total_verses: number }> }) => {
          const chapters = book.chapters
          return sum + (chapters?.reduce((chapterSum, chapter) => 
            chapterSum + (chapter.total_verses || 0), 0) || 0)
        }, 0) || 0

        // Count covered verses for this version
        const versionCoverage = allCoverage?.filter(coverage => 
          coverage.verses?.chapters?.books?.bible_version_id === version.id
        ) || []
        
        const versesCovered = new Set(versionCoverage.map(c => c.verse_id)).size
        const progress = totalVerses > 0 ? (versesCovered / totalVerses) * 100 : 0

        return {
          version,
          progress: Math.round(progress * 100) / 100,
          versesCovered,
          totalVerses
        }
      })

      return progressData
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

      // Get all books and chapters for the bible version
      const { data: booksWithChapters, error: booksError } = await supabase
        .from('books')
        .select(`
          id,
          name,
          chapters (
            id,
            chapter_number,
            total_verses
          )
        `)
        .eq('bible_version_id', bibleVersionId)
        .order('global_order', { ascending: true })

      if (booksError) throw booksError

      // Get all media file coverage for this project
      const { data: allCoverage, error: coverageError } = await supabase
        .from('media_files_verses')
        .select(`
          verse_id,
          media_file_id,
          media_files!inner (project_id),
          verses!inner (chapter_id)
        `)
        .eq('media_files.project_id', projectId)

      if (coverageError) throw coverageError

      // Group coverage by chapter_id
      const coverageByChapter = new Map<string, Set<string>>()
      allCoverage?.forEach(coverage => {
        const chapterId = coverage.verses.chapter_id
        if (!coverageByChapter.has(chapterId)) {
          coverageByChapter.set(chapterId, new Set())
        }
        coverageByChapter.get(chapterId)!.add(coverage.verse_id)
      })

      // Calculate chapter completion status
      let completedChapters = 0
      let completedBooks = 0
      let totalChapters = 0

      booksWithChapters.forEach(book => {
        const chapters = book.chapters || []
        totalChapters += chapters.length

        const chapterStatuses = chapters.map(chapter => {
          const versesCovered = coverageByChapter.get(chapter.id)?.size || 0
          const isComplete = versesCovered >= chapter.total_verses
          if (isComplete) completedChapters++
          return isComplete
        })

        const bookComplete = chapterStatuses.length > 0 && chapterStatuses.every(status => status)
        if (bookComplete) completedBooks++
      })

      return {
        booksProgress: {
          completed: completedBooks,
          total: booksWithChapters.length,
          percentage: booksWithChapters.length > 0 ? (completedBooks / booksWithChapters.length) * 100 : 0
        },
        chaptersProgress: {
          completed: completedChapters,
          total: totalChapters,
          percentage: totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0
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

      if (chaptersError) throw chaptersError

      // Get all media file coverage for this project
      const { data: allCoverage, error: coverageError } = await supabase
        .from('media_files_verses')
        .select(`
          verse_id,
          media_file_id,
          media_files!inner (
            id,
            project_id,
            remote_path,
            duration_seconds
          ),
          verses!inner (chapter_id)
        `)
        .eq('media_files.project_id', projectId)

      if (coverageError) throw coverageError

      // Group coverage and media files by chapter
      const coverageByChapter = new Map<string, Set<string>>()
      const mediaFilesByChapter = new Map<string, Map<string, {
        id: string;
        project_id: string | null;
        remote_path: string | null;
        duration_seconds: number | null;
      }>>()

      allCoverage?.forEach(coverage => {
        const chapterId = coverage.verses.chapter_id
        
        // Track verse coverage
        if (!coverageByChapter.has(chapterId)) {
          coverageByChapter.set(chapterId, new Set())
        }
        coverageByChapter.get(chapterId)!.add(coverage.verse_id)
        
        // Track media files
        if (!mediaFilesByChapter.has(chapterId)) {
          mediaFilesByChapter.set(chapterId, new Map())
        }
        mediaFilesByChapter.get(chapterId)!.set(coverage.media_file_id, coverage.media_files)
      })

      // Build table data
      return chaptersWithBooks.map(chapter => {
        const versesCovered = coverageByChapter.get(chapter.id)?.size || 0
        const progressFraction = chapter.total_verses > 0 ? versesCovered / chapter.total_verses : 0
        const mediaFilesMap = mediaFilesByChapter.get(chapter.id) || new Map()
        const mediaFiles = Array.from(mediaFilesMap.values())

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