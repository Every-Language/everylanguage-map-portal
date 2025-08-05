import { useQuery } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useBibleProjectDashboard } from './bible-structure'
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

      // OPTIMIZED: Run independent queries in parallel instead of sequentially
      const [audioVersionsResult, projectResult] = await Promise.all([
        supabase
        .from('audio_versions')
        .select('id')
          .eq('project_id', projectId),
        supabase
          .from('projects')
          .select('target_language_entity_id')
          .eq('id', projectId)
          .single()
      ]);

      const { data: audioVersions, error: audioVersionsError } = audioVersionsResult;
      const { data: project, error: projectError } = projectResult;

      if (audioVersionsError) throw audioVersionsError;
      if (projectError) throw projectError;

      const audioVersionIds = audioVersions?.map(v => v.id) || [];

      // OPTIMIZED: Run media files and text queries in parallel
      const mediaQueryPromises = [];
      const textQueryPromises = [];

      // Single media files query instead of two separate ones - we'll sort in memory
      if (audioVersionIds.length > 0) {
        mediaQueryPromises.push(
          supabase
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
            .limit(limit * 2) // Get more records to allow for sorting both ways
        );
      }

      // Text updates query
      if (project?.target_language_entity_id) {
        textQueryPromises.push(
          supabase
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
        );
      }

      // Execute all remaining queries in parallel
      const allPromises = [...mediaQueryPromises, ...textQueryPromises];
      const results = await Promise.all(allPromises);

      let mediaFiles: MediaFile[] = [];
      let recentUploads: MediaFile[] = [];
      let recentTextUpdates: VerseText[] = [];

      // Process results
      if (results.length > 0 && audioVersionIds.length > 0) {
        const { data: allMediaFiles, error: mediaError } = results[0];
        if (mediaError) throw mediaError;
        
        if (allMediaFiles) {
          // Sort by updated_at for recent activity
          mediaFiles = ([...allMediaFiles] as any)
            .sort((a: any, b: any) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
            .slice(0, limit);
          
          // Sort by created_at for recent uploads  
          recentUploads = ([...allMediaFiles] as any)
            .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .slice(0, limit);
        }
      }

      // Process text updates if they exist
      const textResultIndex = audioVersionIds.length > 0 ? 1 : 0;
      if (results.length > textResultIndex && project?.target_language_entity_id) {
        const { data: textUpdates, error: textError } = results[textResultIndex];
        if (!textError) {
          recentTextUpdates = (textUpdates as any) || [];
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
  const { data: users } = useProjectUsers(projectId)

  return useQuery<ProjectMetadata, SupabaseError>({
    queryKey: ['project-metadata', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')

      // OPTIMIZED: Single query with JOINs instead of multiple sequential queries
      const { data: projectWithRelations, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          created_at,
          updated_at,
          source_language_entity:language_entities!source_language_entity_id(
            id,
            name
          ),
          target_language_entity:language_entities!target_language_entity_id(
            id,
            name
          ),
          region:regions!region_id(
            id,
            name
          )
        `)
        .eq('id', projectId)
          .single()

      if (error) throw error
      if (!projectWithRelations) throw new Error('Project not found')

      return {
        name: projectWithRelations.name,
        description: projectWithRelations.description || '',
        sourceLanguage: projectWithRelations.source_language_entity || null,
        targetLanguage: projectWithRelations.target_language_entity || null,
        region: projectWithRelations.region || null,
        users: users || [],
        createdAt: projectWithRelations.created_at || null,
        updatedAt: projectWithRelations.updated_at || null
      }
    },
    enabled: !!projectId,
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

      // OPTIMIZED: Collect all verse IDs from all books/chapters at once
      const allVerseIds: string[] = []
      const verseToChapterMap = new Map<string, string>() // verse_id -> chapter_id
      
      books.forEach(book => {
        book.chapters?.forEach(chapter => {
          chapter.verses?.forEach(verse => {
            allVerseIds.push(verse.id)
            verseToChapterMap.set(verse.id, chapter.id)
          })
        })
      })

      // OPTIMIZED: Single query to get all verse texts for all verses at once
      let verseTextsWithChapter: { verse_id: string; chapter_id: string }[] = []
      if (allVerseIds.length > 0) {
              const { data: verseTexts } = await supabase
                .from('verse_texts')
                .select(`
                  verse_id,
                  text_versions!inner (
                    language_entity_id
                  )
                `)
          .in('verse_id', allVerseIds)
                .eq('text_versions.language_entity_id', project.target_language_entity_id)

        // Map verse texts to their chapters
        verseTextsWithChapter = (verseTexts || []).map(vt => ({
          verse_id: vt.verse_id,
          chapter_id: verseToChapterMap.get(vt.verse_id) || ''
        })).filter(item => item.chapter_id)
      }

      // Group verse texts by chapter for fast lookup
      const verseTextsByChapter = new Map<string, Set<string>>()
      verseTextsWithChapter.forEach(vt => {
        if (!verseTextsByChapter.has(vt.chapter_id)) {
          verseTextsByChapter.set(vt.chapter_id, new Set())
        }
        verseTextsByChapter.get(vt.chapter_id)!.add(vt.verse_id)
      })

      // Process books and chapters in memory (no more N+1 queries!)
      const booksWithTextProgress = books.map((book: {
        id: string
        name: string
        chapters: Array<{
          id: string
          chapter_number: number
          total_verses: number
          verses: Array<{ id: string; verse_number: number }>
        }>
      }) => {
        const chaptersWithTextProgress = (book.chapters || []).map((chapter) => {
          // Get verse texts for this chapter from our pre-computed map
          const verseTextsInChapter = verseTextsByChapter.get(chapter.id) || new Set()
          const versesWithText = verseTextsInChapter.size
              const textProgress = chapter.total_verses > 0 ? (versesWithText / chapter.total_verses) * 100 : 0

              return {
                ...chapter,
                textProgress: Math.round(textProgress * 100) / 100,
                versesWithText
              }
            })

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
        .limit(2000) // Reasonable limit: ~1200 chapters in Bible + buffer for custom content

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
        .limit(10000) // Reasonable limit: prevents runaway queries while allowing large projects

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