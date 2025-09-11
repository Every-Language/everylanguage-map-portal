import React from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import { useSelection } from '../inspector/state/inspectorStore'
import { useQuery } from '@tanstack/react-query'
import { fetchLanguageListensHeatmap, fetchRegionLanguageListensHeatmap, type HeatmapPoint } from './api'
import type { FilterSpecification, ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'

function toFeatureCollection(points: HeatmapPoint[]): GeoJSON.FeatureCollection<GeoJSON.Point, { weight: number; lastAt: string | null }> {
  const features: GeoJSON.Feature<GeoJSON.Point, { weight: number; lastAt: string | null }>[] = points.map((p) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    properties: { weight: Math.log((p.count ?? 0) + 1), lastAt: p.lastAt ?? null },
  }))
  return { type: 'FeatureCollection', features }
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.substring(0, 2), 16)
  const g = parseInt(normalized.substring(2, 4), 16)
  const b = parseInt(normalized.substring(4, 6), 16)
  return [r, g, b]
}

function colorRampForHex(hex: string): ExpressionSpecification {
  const [r, g, b] = hexToRgb(hex)
  return [
    'interpolate', ['linear'], ['heatmap-density'],
    0, 'rgba(0,0,0,0)',
    0.2, `rgba(${r},${g},${b},0.35)`,
    0.4, `rgba(${r},${g},${b},0.55)`,
    0.6, `rgba(${r},${g},${b},0.7)`,
    0.8, `rgba(${r},${g},${b},0.85)`,
    1, `rgba(${r},${g},${b},0.95)`,
  ] as unknown as ExpressionSpecification
}

export const MapAnalyticsLayers: React.FC<{ show: boolean }> = ({ show }) => {
  const selection = useSelection()
  const languageEntityId = selection?.kind === 'language_entity' ? selection.id : null
  const regionId = selection?.kind === 'region' ? selection.id : null

  const listensQuery = useQuery({
    enabled: !!languageEntityId && show,
    queryKey: ['lang-heatmap-listens', languageEntityId],
    queryFn: () => fetchLanguageListensHeatmap(languageEntityId!),
    staleTime: 5 * 60 * 1000,
  })

  // Region: fetch country codes and country-language rows
  // Try descendants (countries within region) and self country code as a fallback
  // Region rows directly from vw_country_language_listens_heatmap by region_id
  const regionHeatmapQuery = useQuery<{ language_entity_id: string; grid: { type: string; coordinates: [number, number] }; event_count: number; last_event_at: string | null }[], Error>({
    enabled: !!regionId && show,
    queryKey: ['region-lang-heatmap', regionId],
    queryFn: () => fetchRegionLanguageListensHeatmap(regionId!),
    staleTime: 5 * 60 * 1000,
  })

  // remove debug

  if (!show) return null

  // Language mode
  if (languageEntityId) {
    const listensFc = toFeatureCollection(listensQuery.data ?? [])
    return (
      <>
        {listensFc.features.length > 0 && (
          <Source id="listens-heatmap" type="geojson" data={listensFc}>
            <Layer
              id="listens-heatmap-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 8, 1],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 6, 1.2, 9, 1.6],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 4, 10, 8, 22, 12, 30],
                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 8, 0.6],
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(0,0,0,0)',
                  0.2, 'rgba(56, 135, 190, 0.35)',
                  0.4, 'rgba(40, 122, 185, 0.55)',
                  0.6, 'rgba(255, 165, 0, 0.7)',
                  0.8, 'rgba(255, 99, 71, 0.85)',
                  1, 'rgba(255, 0, 0, 0.95)'
                ],
              }}
            />
            <Layer
              id="listens-heatmap-detail"
              type="circle"
              minzoom={8}
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 12, 6],
                'circle-color': 'rgba(255,99,71,0.7)',
                'circle-stroke-color': 'rgba(255,255,255,0.7)',
                'circle-stroke-width': 1,
                'circle-opacity': 0.6,
              }}
            />
          </Source>
        )}
      </>
    )
  }

  // Region mode
  if (regionId) {
    const rows = regionHeatmapQuery.data ?? []
    if (rows.length === 0) return null
    const features: GeoJSON.Feature<GeoJSON.Point, { language_entity_id: string; weight: number; lastAt: string | null }>[] = []
    for (const r of rows) {
      const coords = r.grid && Array.isArray((r.grid as { coordinates?: unknown }).coordinates) ? (r.grid as { coordinates: [number, number] }).coordinates : undefined
      if (!coords) continue
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: { language_entity_id: r.language_entity_id, weight: Math.log((r.event_count ?? 0) + 1), lastAt: r.last_event_at ?? null },
      })
    }
    const fc: GeoJSON.FeatureCollection<GeoJSON.Point, { language_entity_id: string; weight: number; lastAt: string | null }> = { type: 'FeatureCollection', features }
    const langIds = Array.from(new Set(rows.map(r => r.language_entity_id)))
    const palette = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#a65628','#f781bf','#999999','#66c2a5','#fc8d62','#8da0cb','#e78ac3']
    if (import.meta.env.DEV) console.debug('[analytics] region', regionId, 'languages', langIds.length)

    return (
      <Source id="region-listens-heatmap" type="geojson" data={fc}>
        {langIds.map((lid, i) => (
          <Layer
            key={lid}
            id={`region-listens-heatmap-${i}`}
            type="heatmap"
            filter={['==', ['get', 'language_entity_id'], lid] as unknown as FilterSpecification}
            paint={{
              'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 8, 1],
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.9, 6, 1.6, 9, 2.0],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 4, 14, 8, 28, 12, 36],
              'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.45, 8, 0.6],
              'heatmap-color': colorRampForHex(palette[i % palette.length]) as unknown as ExpressionSpecification,
            }}
          />
        ))}
        {langIds.map((lid, i) => (
          <Layer
            key={`region-listens-detail-${lid}`}
            id={`region-listens-detail-${i}`}
            type="circle"
            minzoom={8}
            filter={['==', ['get', 'language_entity_id'], lid] as unknown as FilterSpecification}
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 12, 6],
              'circle-color': palette[i % palette.length],
              'circle-stroke-color': 'rgba(255,255,255,0.7)',
              'circle-stroke-width': 1,
              'circle-opacity': 0.6,
            }}
          />
        ))}
      </Source>
    )
  }

  return null
}


