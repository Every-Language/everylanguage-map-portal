import { useFetchCollection, useFetchById } from './base-hooks'
import type { TableRow } from './base-hooks'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'

export type Region = TableRow<'regions'>

// Type for region fuzzy search results (updated for optimized function)
export interface RegionSearchResult {
  // No more search metadata - removed for performance

  // Best alias data
  alias_id: string
  alias_name: string
  alias_similarity_score: number

  // Region data
  region_id: string
  region_name: string
  region_level: 'continent' | 'world_region' | 'country' | 'state' | 'province' | 'district' | 'town' | 'village'
  region_parent_id: string | null

  // Optimized languages (JSONB)
  languages: Array<{
    entity_id: string
    entity_name: string
    entity_level: string
    entity_parent_id: string | null
    dominance_level: number
  }> | null

  // Keep similarity threshold for compatibility
  similarity_threshold_used: number
}

// Simplified metadata type (no more count/limit info)
export interface RegionSearchMetadata {
  thresholdUsed: number
}

// Type for Supabase client with updated RPC functions
type SupabaseWithRPC = typeof supabase & {
  rpc: (fn: 'search_region_aliases', args: {
    search_query: string
    max_results: number
    min_similarity: number
    include_languages: boolean
  }) => Promise<{ data: RegionSearchResult[] | null; error: Error | null }>
}

// Hook to fetch all regions
export function useRegions() {
  return useFetchCollection('regions', {
    orderBy: { column: 'name', ascending: true }
  })
}

// Hook to fetch a single region by ID
export function useRegion(id: string | null) {
  return useFetchById('regions', id)
}

// Hook to fetch root regions (no parent)
export function useRootRegions() {
  return useFetchCollection('regions', {
    filters: { parent_id: null },
    orderBy: { column: 'name', ascending: true }
  })
}

// Hook to fetch child regions by parent ID
export function useChildRegions(parentId: string | null) {
  return useFetchCollection('regions', {
    filters: { parent_id: parentId },
    orderBy: { column: 'name', ascending: true },
    enabled: !!parentId,
  })
}

// Hook to fetch regions by country
export function useRegionsByCountry(country: string | null) {
  return useFetchCollection('regions', {
    filters: { country },
    orderBy: { column: 'name', ascending: true },
    enabled: !!country,
  })
}

// Hook to search regions by name (legacy)
export function useRegionsByName(searchTerm: string | null) {
  return useFetchCollection('regions', {
    // Note: This would need to be implemented with ilike filter in a more complex version
    filters: searchTerm ? { name: searchTerm } : undefined,
    orderBy: { column: 'name', ascending: true },
    enabled: !!searchTerm,
  })
}

// Hook for fuzzy search of regions
export function useRegionsFuzzySearch(
  query: string,
  options: {
    maxResults?: number
    minSimilarity?: number
    enabled?: boolean
  } = {}
) {
  const { 
    maxResults = 50, 
    minSimilarity = 0.1, 
    enabled = true 
  } = options

  return useQuery<{
    results: RegionSearchResult[]
    metadata: RegionSearchMetadata
  }>({
    queryKey: ['regions_fuzzy_search', query, maxResults, minSimilarity],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return {
          results: [],
          metadata: { thresholdUsed: 0 }
        }
      }

      // Use type assertion to work around missing RPC function types
      const { data, error } = await (supabase as SupabaseWithRPC).rpc('search_region_aliases', {
        search_query: query,
        max_results: maxResults,
        min_similarity: minSimilarity,
        include_languages: false, // No longer needed
      })

      if (error) throw error
      if (!data?.length) {
        return {
          results: [],
          metadata: { thresholdUsed: 0 }
        }
      }

      return {
        results: data as RegionSearchResult[],
        metadata: {
          thresholdUsed: data[0].similarity_threshold_used,
        }
      }
    },
    enabled: enabled && !!query && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Hook for progressive fuzzy search (tries multiple similarity thresholds)
export function useRegionsProgressiveSearch(query: string, enabled: boolean = true) {
  return useQuery<{
    results: RegionSearchResult[]
    metadata: RegionSearchMetadata
  }>({
    queryKey: ['regions_progressive_search', query],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return {
          results: [],
          metadata: { thresholdUsed: 0 }
        }
      }

      // Try strict search first
      const { data: initialData, error: initialError } = await (supabase as SupabaseWithRPC).rpc('search_region_aliases', {
        search_query: query,
        max_results: 15,
        min_similarity: 0.35,
        include_languages: false, // No longer needed
      })

      if (initialError) throw initialError
      let data = initialData

      // If we don't have enough results, try more lenient search
      if (!data || data.length < 5) {
        const { data: lenientData, error: lenientError } = await (supabase as SupabaseWithRPC).rpc('search_region_aliases', {
          search_query: query,
          max_results: 25,
          min_similarity: 0.2,
          include_languages: false, // No longer needed
        })

        if (lenientError) throw lenientError
        data = lenientData || []
      }

      // Final fallback - very lenient
      if (!data || data.length < 3) {
        const { data: veryLenientData, error: veryLenientError } = await (supabase as SupabaseWithRPC).rpc('search_region_aliases', {
          search_query: query,
          max_results: 35,
          min_similarity: 0.1,
          include_languages: false, // No longer needed
        })

        if (veryLenientError) throw veryLenientError
        data = veryLenientData || []
      }

      if (!data?.length) {
        return {
          results: [],
          metadata: { thresholdUsed: 0 }
        }
      }

      return {
        results: data as RegionSearchResult[],
        metadata: {
          thresholdUsed: data[0].similarity_threshold_used,
        }
      }
    },
    enabled: enabled && !!query && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  })
} 