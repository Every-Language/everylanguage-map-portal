import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'

export const THIRTY_MINUTES = 30 * 60 * 1000

export function useRegionBoundary(regionId: string | null | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    enabled: !!regionId && (opts?.enabled ?? true),
    queryKey: ['overlay-region-boundary', regionId ?? null],
    queryFn: async () => {
      if (!regionId) return null as GeoJSON.Geometry | null
      // Prefer simplified boundary via RPC for lightweight overlay
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_region_boundary_simplified_by_id', { p_region_id: regionId, p_tolerance: null })
      if (error) throw error
      const row = Array.isArray(data) ? (data[0] as { boundary?: unknown } | undefined) : (data as { boundary?: unknown } | null)
      const boundary = row && 'boundary' in row ? (row as { boundary?: unknown }).boundary : null
      return (boundary ?? null) as GeoJSON.Geometry | null
    },
    staleTime: THIRTY_MINUTES,
  })
}

export function useLanguageOverlayGeometries(languageEntityId: string | null | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    enabled: !!languageEntityId && (opts?.enabled ?? true),
    queryKey: ['overlay-language', languageEntityId ?? null],
    queryFn: async () => {
      if (!languageEntityId) return [] as GeoJSON.Geometry[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('language_entities_regions')
        .select('regions(boundary_simplified)')
        .eq('language_entity_id', languageEntityId)
      if (error) throw error
      const features = (data ?? [])
        .map((r: { regions: { boundary_simplified: unknown } }) => (r.regions?.boundary_simplified ?? null) as GeoJSON.Geometry | null)
        .filter((g: GeoJSON.Geometry | null): g is GeoJSON.Geometry => !!g)
      return features
    },
    staleTime: THIRTY_MINUTES,
  })
}

export function useLanguageOverlayGeometriesForIds(languageEntityIds: string[] | null | undefined, opts?: { enabled?: boolean }) {
  const key = React.useMemo(() => {
    const arr = Array.isArray(languageEntityIds) ? [...languageEntityIds] : []
    arr.sort()
    return ['overlay-language-many', arr.join(',')]
  }, [languageEntityIds])
  return useQuery({
    enabled: !!languageEntityIds && languageEntityIds.length > 0 && (opts?.enabled ?? true),
    queryKey: key,
    queryFn: async () => {
      const ids = languageEntityIds ?? []
      if (ids.length === 0) return [] as GeoJSON.Geometry[]
      const { data, error } = await supabase
        .from('language_entities_regions')
        .select('regions(boundary),language_entity_id')
        .in('language_entity_id', ids)
      if (error) throw error
      const features = (data ?? [])
        .map((r: { regions: { boundary: unknown } }) => (r.regions?.boundary ?? null) as GeoJSON.Geometry | null)
        .filter((g): g is GeoJSON.Geometry => !!g)
      return features
    },
    staleTime: THIRTY_MINUTES,
  })
}


