import React from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import { useSelection } from '../state/inspectorStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'

// Minimal overlay that highlights the selected region or the union of regions for a language.
export const MapOverlayLayers: React.FC = () => {
  const selection = useSelection()

  const regionQuery = useQuery({
    enabled: !!selection && (selection.kind === 'region' || selection.kind === 'project'),
    queryKey: ['overlay-region', selection?.kind, selection ? (selection as { id: string }).id : null],
    queryFn: async () => {
      if (!selection) return null
      let regionId: string | null = null
      if (selection.kind === 'region') regionId = selection.id
      if (selection.kind === 'project') {
        const { data } = await supabase.from('projects').select('region_id').eq('id', selection.id).single()
        regionId = data?.region_id ?? null
      }
      if (!regionId) return null
      const { data, error } = await supabase.from('regions').select('boundary').eq('id', regionId).single()
      if (error) throw error
      return data?.boundary as GeoJSON.Geometry | null
    }
  })

  const langRegionsQuery = useQuery({
    enabled: !!selection && selection.kind === 'language_entity',
    queryKey: ['overlay-language', selection?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities_regions')
        .select('regions(boundary)')
        .eq('language_entity_id', (selection as { id: string }).id)
      if (error) throw error
      const features = (data ?? [])
        .map((r: { regions: { boundary: unknown } }) => (r.regions?.boundary ?? null) as GeoJSON.Geometry | null)
        .filter((g): g is GeoJSON.Geometry => !!g)
      return features
    }
  })

  const features: GeoJSON.Feature[] = []
  if (regionQuery.data) features.push({ type: 'Feature', geometry: regionQuery.data, properties: {} })
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


