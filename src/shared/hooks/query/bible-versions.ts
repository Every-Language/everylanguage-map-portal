import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import { useSelectedBibleVersionId, useSetSelectedBibleVersionId, useFetchBibleVersions, useBibleVersions } from '../../stores/project'
import { useEffect } from 'react'
import type { Tables } from '@everylanguage/shared-types'

export type BibleVersion = Tables<'bible_versions'>

// Hook to fetch all bible versions from API (alternative to store version)
export function useBibleVersionsQuery() {
  return useQuery<BibleVersion[]>({
    queryKey: ['bible-versions-query'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bible_versions')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    }
  })
}

// Hook to get a specific bible version by ID
export function useBibleVersion(id: string | null) {
  return useQuery<BibleVersion | null>({
    queryKey: ['bible-version', id],
    queryFn: async () => {
      if (!id) return null
      
      const { data, error } = await supabase
        .from('bible_versions')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

// Hook that ensures a bible version is selected and provides auto-selection
export function useSelectedBibleVersion() {
  const selectedBibleVersionId = useSelectedBibleVersionId()
  const bibleVersionsFromStore = useBibleVersions()
  const { data: bibleVersions } = useBibleVersionsQuery()
  const setSelectedBibleVersionId = useSetSelectedBibleVersionId()
  const fetchBibleVersions = useFetchBibleVersions()

  // Auto-select first bible version if none is selected
  useEffect(() => {
    if (!selectedBibleVersionId && bibleVersions && bibleVersions.length > 0) {
      setSelectedBibleVersionId(bibleVersions[0].id)
    }
  }, [selectedBibleVersionId, bibleVersions, setSelectedBibleVersionId])

  // Ensure bible versions are loaded
  useEffect(() => {
    if (bibleVersionsFromStore.length === 0) {
      fetchBibleVersions()
    }
  }, [bibleVersionsFromStore.length, fetchBibleVersions])

  return {
    selectedBibleVersionId,
    selectedBibleVersion: bibleVersions?.find(v => v.id === selectedBibleVersionId) || null,
    allBibleVersions: bibleVersions || [],
    setSelectedBibleVersionId,
    isLoading: bibleVersionsFromStore.length === 0
  }
}

// Export the store version for convenience 
export { useBibleVersions } from '../../stores/project' 