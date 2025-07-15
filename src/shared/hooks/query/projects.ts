import { useFetchCollection, useFetchById } from './base-hooks'
import { useQuery } from '@tanstack/react-query'
import type { TableRow, SupabaseError } from './base-hooks'

export type Project = TableRow<'projects'>

// Hook to fetch all projects
export function useProjects() {
  return useFetchCollection('projects')
}

// Hook to fetch a single project by ID
export function useProject(id: string | null) {
  return useFetchById('projects', id)
}

// Hook to fetch projects by user ID
export function useProjectsByUser(userId: string | null) {
  return useFetchCollection('projects', {
    filters: { created_by: userId },
    enabled: !!userId,
  })
}

// Hook to fetch project member count
export function useProjectMemberCount(projectId: string | null) {
  return useQuery<number, SupabaseError>({
    queryKey: ['project-member-count', projectId],
    queryFn: async () => {
      if (!projectId) return 0
      
      // TODO: Implement proper project_members table query when available
      // For now, return 1 as default (project creator)
      // Future implementation:
      // const { count } = await supabase
      //   .from('project_members')
      //   .select('*', { count: 'exact', head: true })
      //   .eq('project_id', projectId)
      // return count || 1
      
      return 1
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to fetch enhanced project metadata
export function useProjectWithMetadata(projectId: string | null) {
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId)
  const { data: memberCount, isLoading: memberLoading } = useProjectMemberCount(projectId)
  
  return {
    data: project ? {
      ...project,
      member_count: memberCount || 1
    } : null,
    isLoading: projectLoading || memberLoading,
    error: projectError
  }
} 