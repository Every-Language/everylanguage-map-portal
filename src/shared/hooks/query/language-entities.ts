import { useQuery } from '@tanstack/react-query'
import { useFetchCollection, useFetchById, type TableRow, transformError } from './base-hooks'
import { supabase } from '../../services/supabase'

// Type for fuzzy search results (updated for optimized function)
export interface LanguageSearchResult {
  // No more search metadata - removed for performance

  // Best alias data
  alias_id: string
  alias_name: string
  alias_similarity_score: number

  // Language entity data
  entity_id: string
  entity_name: string
  entity_level: 'family' | 'language' | 'dialect' | 'mother_tongue'
  entity_parent_id: string | null

  // Optimized regions (JSONB)
  regions: Array<{
    region_id: string
    region_name: string
    region_level: string
    region_parent_id: string | null
    dominance_level: number
  }> | null

  // Keep similarity threshold for compatibility
  similarity_threshold_used: number
}

// Simplified metadata type (no more count/limit info)
export interface LanguageSearchMetadata {
  thresholdUsed: number
}

// Type for Supabase client with updated RPC functions
type SupabaseWithRPC = typeof supabase & {
  rpc: (fn: 'search_language_aliases', args: {
    search_query: string
    max_results: number
    min_similarity: number
    include_regions: boolean
  }) => Promise<{ data: LanguageSearchResult[] | null; error: Error | null }>
}

export type LanguageEntity = TableRow<'language_entities'>

export function useLanguageEntities() {
  return useFetchCollection('language_entities')
}

export function useRootLanguageEntities() {
  return useQuery({
    queryKey: ['language_entities', 'roots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities')
        .select('*')
        .is('parent_language_entity_id', null)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });
}

export function useChildLanguageEntities(parentId: string | null) {
  return useQuery({
    queryKey: ['language_entities', 'children', parentId],
    queryFn: async () => {
      if (!parentId) return [];
      
      const { data, error } = await supabase
        .from('language_entities')
        .select('*')
        .eq('parent_language_entity_id', parentId)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!parentId
  });
}

export function useLanguageEntity(id: string | null) {
  return useFetchById('language_entities', id)
}

export function useLanguageEntitiesByIds(ids: string[]) {
  return useQuery({
    queryKey: ['language_entities', 'by_ids', ids.sort()],
    queryFn: async () => {
      if (ids.length === 0) return []
      
      const { data, error } = await supabase
        .from('language_entities')
        .select('id, name')
        .in('id', ids)
      
      if (error) {
        throw transformError(error)
      }
      
      return data as Array<{ id: string; name: string }>
    },
    enabled: ids.length > 0,
  })
}

export function useLanguageEntitiesByName(searchTerm: string | null) {
  return useFetchCollection('language_entities', {
    filters: searchTerm ? { name: searchTerm } : undefined,
    orderBy: { column: 'name', ascending: true },
  })
}

// Hook for fuzzy search of language entities (updated for new signature)
export function useLanguagesFuzzySearch(
  query: string,
  options: {
    maxResults?: number
    minSimilarity?: number
    includeRegions?: boolean
    enabled?: boolean
  } = {}
) {
  const { 
    maxResults = 30, 
    minSimilarity = 0.1,
    includeRegions = true,
    enabled = true 
  } = options

  return useQuery<{
    results: LanguageSearchResult[]
    metadata: LanguageSearchMetadata
  }>({
    queryKey: ['languages_fuzzy_search', query, maxResults, minSimilarity, includeRegions],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return {
          results: [],
          metadata: { thresholdUsed: 0 }
        }
      }

      // Use updated function signature
      const { data, error } = await (supabase as SupabaseWithRPC).rpc('search_language_aliases', {
        search_query: query,
        max_results: maxResults,
        min_similarity: minSimilarity,
        include_regions: includeRegions
      })

      if (error) throw error
      if (!data?.length) {
        return {
          results: [],
          metadata: { thresholdUsed: 0 }
        }
      }

      return {
        results: data as LanguageSearchResult[],
        metadata: {
          thresholdUsed: data[0].similarity_threshold_used,
        }
      }
    },
    enabled: enabled && !!query && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Hook for progressive fuzzy search (updated for new signature)
export function useLanguagesProgressiveSearch(query: string, enabled: boolean = true) {
  return useQuery<{
    results: LanguageSearchResult[]
    metadata: LanguageSearchMetadata
  }>({
    queryKey: ['languages_progressive_search', query],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return {
          results: [],
          metadata: { thresholdUsed: 0 }
        }
      }

      // Try strict search first with regions included
      const { data: initialData, error: initialError } = await (supabase as SupabaseWithRPC).rpc('search_language_aliases', {
        search_query: query,
        max_results: 15,
        min_similarity: 0.35,
        include_regions: true
      })

      if (initialError) throw initialError
      let data = initialData

      // If we don't have enough results, try more lenient search
      if (!data || data.length < 5) {
        const { data: lenientData, error: lenientError } = await (supabase as SupabaseWithRPC).rpc('search_language_aliases', {
          search_query: query,
          max_results: 25,
          min_similarity: 0.2,
          include_regions: true
        })

        if (lenientError) throw lenientError
        data = lenientData || []
      }

      // Final fallback - very lenient
      if (!data || data.length < 3) {
        const { data: veryLenientData, error: veryLenientError } = await (supabase as SupabaseWithRPC).rpc('search_language_aliases', {
          search_query: query,
          max_results: 35,
          min_similarity: 0.1,
          include_regions: true
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
        results: data as LanguageSearchResult[],
        metadata: {
          thresholdUsed: data[0].similarity_threshold_used,
        }
      }
    },
    enabled: enabled && !!query && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Hook for getting language hierarchy with regions
export function useLanguageHierarchy(languageId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['language_hierarchy', languageId],
    queryFn: async () => {
      if (!languageId) return { hierarchy: [], regions: [] };

      // Get language hierarchy
      const { data: hierarchyData, error: hierarchyError } = await (supabase as unknown as { 
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }> 
      }).rpc('get_language_entity_hierarchy', {
        entity_id: languageId,
        generations_up: 2,
        generations_down: 2
      });

      if (hierarchyError) throw hierarchyError;

      // For now, return empty regions array - you'll need to implement language-region relationship
      // This could be done through a language_regions table or by using location-based associations
      return {
        hierarchy: hierarchyData || [],
        regions: [] // TODO: Implement language-region relationships
      };
    },
    enabled: enabled && !!languageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for getting regions associated with multiple languages
export function useLanguagesWithRegions(languageIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['languages_with_regions', languageIds],
    queryFn: async () => {
      if (!languageIds.length) return {};

      const results: Record<string, Array<{ id: string; name: string; level: string }>> = {};

      // For each language, get associated regions
      // This is a placeholder - you'll need to implement the actual language-region relationship
      for (const languageId of languageIds) {
        // TODO: Query your language-region association table
        // For now, return empty array
        results[languageId] = [];
      }

      return results;
    },
    enabled: enabled && languageIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 