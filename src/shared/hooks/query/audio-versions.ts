import { useFetchCollection, useFetchById } from './base-hooks'
import type { TableRow } from './base-hooks'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export type AudioVersion = TableRow<'audio_versions'>

// AUDIO VERSION HOOKS
// Hook to fetch all audio versions
export function useAudioVersions() {
  return useFetchCollection('audio_versions', {
    orderBy: { column: 'created_at', ascending: false }
  })
}

// Hook to fetch audio versions by project (target language)
export function useAudioVersionsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['audio_versions_by_project', projectId],
    queryFn: async () => {
      if (!projectId) return []
      
      // Get the project to get the target language entity
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single()
      
      if (projectError) throw projectError
      if (!project?.target_language_entity_id) return []
      
      const { data, error } = await supabase
        .from('audio_versions')
        .select('*')
        .eq('language_entity_id', project.target_language_entity_id)
        .is('deleted_at', null) // Exclude soft-deleted versions
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as AudioVersion[]
    },
    enabled: !!projectId,
  })
}

// Hook to fetch a single audio version by ID
export function useAudioVersion(id: string | null) {
  return useFetchById('audio_versions', id)
}

// MUTATION HOOKS

/**
 * Hook to create an audio version
 */
export function useCreateAudioVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (audioVersionData: {
      name: string
      language_entity_id: string
      bible_version_id: string
      project_id?: string | null
      created_by?: string | null
    }) => {
      const { data, error } = await supabase
        .from('audio_versions')
        .insert({
          name: audioVersionData.name,
          language_entity_id: audioVersionData.language_entity_id,
          bible_version_id: audioVersionData.bible_version_id,
          project_id: audioVersionData.project_id || null,
          created_by: audioVersionData.created_by || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio_versions'] })
      queryClient.invalidateQueries({ queryKey: ['audio_versions_by_project'] })
    },
  })
}

/**
 * Hook to update an audio version
 */
export function useUpdateAudioVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string
      updates: {
        name?: string
        bible_version_id?: string
      }
    }) => {
      const updateData: Record<string, string> = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.name !== undefined) {
        updateData.name = updates.name
      }
      
      if (updates.bible_version_id !== undefined) {
        updateData.bible_version_id = updates.bible_version_id
      }

      const { data, error } = await supabase
        .from('audio_versions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio_versions'] })
      queryClient.invalidateQueries({ queryKey: ['audio_versions_by_project'] })
    },
  })
}

/**
 * Hook to soft delete an audio version
 */
export function useSoftDeleteAudioVersion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('audio_versions')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio_versions'] })
      queryClient.invalidateQueries({ queryKey: ['audio_versions_by_project'] })
    },
  })
} 