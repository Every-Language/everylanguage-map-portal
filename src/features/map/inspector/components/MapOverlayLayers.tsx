import React from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import { useSelection } from '../state/inspectorStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { useLanguageOverlayGeometries, useRegionBoundary } from '../hooks/overlay'

// Minimal overlay that highlights the selected region or the union of regions for a language.
export const MapOverlayLayers: React.FC = () => {
  const selection = useSelection()

  const projectRegionIdQuery = useQuery({
    enabled: !!selection && selection.kind === 'project',
    queryKey: ['overlay-project-region', selection?.kind, selection ? (selection as { id: string }).id : null],
    queryFn: async () => {
      if (!selection || selection.kind !== 'project') return null as string | null
      const { data } = await supabase.from('projects').select('region_id').eq('id', selection.id).single()
      return (data?.region_id ?? null) as string | null
    },
    staleTime: 30 * 60 * 1000,
  })

  const regionBoundary = useRegionBoundary(
    selection?.kind === 'region' ? selection.id : projectRegionIdQuery.data ?? null,
    { enabled: !!selection && (selection.kind === 'region' || !!projectRegionIdQuery.data) }
  )

  const langRegionsQuery = useLanguageOverlayGeometries(selection?.kind === 'language_entity' ? selection.id : null, { enabled: !!selection && selection.kind === 'language_entity' })

  const features: GeoJSON.Feature[] = []
  if (regionBoundary.data) features.push({ type: 'Feature', geometry: regionBoundary.data, properties: {} })
  if (langRegionsQuery.data?.length) {
    for (const g of langRegionsQuery.data) features.push({ type: 'Feature', geometry: g, properties: {} })
  }

  if (!features.length) return null

  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features }

  return (
    <Source id="selection-overlay" type="geojson" data={fc}>
      <Layer id="selection-fill" type="fill" paint={{ 'fill-color': '#ad915a', 'fill-opacity': 0.25 }} />
      <Layer id="selection-outline" type="line" paint={{ 'line-color': '#ad915a', 'line-width': 2 }} />
    </Source>
  )
}


