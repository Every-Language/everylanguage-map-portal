import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card'
import { Select, SelectItem } from '@/shared/components/ui/Select'
import { usePartnerOrgData } from '../data/usePartnerOrgData'
import { MapShell } from '@/features/map/components/MapShell'
import { useMapContext } from '@/features/map/context/MapContext'
import * as maplibregl from 'maplibre-gl'
import type { Map as MLMap, MapLayerMouseEvent } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'

const DistributionLayers: React.FC<{ points: ReturnType<typeof usePartnerOrgData>['distributionPoints'] }> = ({ points }) => {
  const { mapRef } = useMapContext()

  // Keep latest points in a ref so style.load re-add uses fresh data
  const latestPointsRef = React.useRef(points)
  React.useEffect(() => { latestPointsRef.current = points }, [points])

  React.useEffect(() => {
    const map = mapRef.current?.getMap?.() as MLMap | undefined
    if (!map) return
    const sourceId = 'mock-distribution'
    const heatLayerId = 'mock-distribution-heat'
    const circleLayerId = 'mock-distribution-circles'
    const symbolLayerId = 'mock-distribution-churches'

    let cancelled = false
    let running = false

    // Popups and handlers are stable within this effect
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
    const churchPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })

    const onMouseMove = (e: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [heatLayerId] })
      if (!features || features.length === 0) { popup.remove(); return }
      const f = features[0]
      const lngLat = e.lngLat
      const count = (f.properties && (f.properties as { count?: number }).count) || ''
      popup.setLngLat(lngLat).setHTML(`<div class="text-xs text-neutral-900">Approx. ${count || '—'} bibles distributed</div>`).addTo(map)
    }
    const onMouseLeave = () => popup.remove()

    const onMouseMoveChurch = (e: MapLayerMouseEvent) => {
      const f = e.features && e.features[0]
      if (!f) { churchPopup.remove(); return }
      const { village, startedAt } = (f.properties || {}) as { village?: string; startedAt?: string }
      churchPopup.setLngLat(e.lngLat).setHTML(`<div class="text-xs text-neutral-900"><div class="font-semibold">House church</div><div>${village || '—'}</div><div>Started: ${startedAt || '—'}</div></div>`).addTo(map)
    }
    const onMouseLeaveChurch = () => churchPopup.remove()

    const buildData = (): FeatureCollection<Point, { intensity: number; kind: 'distribution' | 'church'; count: number; village: string; startedAt: string }> => {
      const pts = latestPointsRef.current
      return {
        type: 'FeatureCollection',
        features: pts.map(p => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: {
            intensity: p.intensity ?? 0.6,
            kind: (p.kind ?? 'distribution') as 'distribution' | 'church',
            count: p.count ?? 0,
            village: p.village ?? '',
            startedAt: p.startedAt ?? ''
          }
        }))
      }
    }

    const cleanupCurrent = () => {
      try { map.off('mousemove', heatLayerId, onMouseMove) } catch { /* noop */ }
      try { map.off('mouseleave', heatLayerId, onMouseLeave) } catch { /* noop */ }
      try { map.off('mousemove', symbolLayerId, onMouseMoveChurch) } catch { /* noop */ }
      try { map.off('mouseleave', symbolLayerId, onMouseLeaveChurch) } catch { /* noop */ }
      try { popup.remove() } catch { /* noop */ }
      try { churchPopup.remove() } catch { /* noop */ }
      try { if (map.getLayer(heatLayerId)) map.removeLayer(heatLayerId) } catch { /* noop */ }
      try { if (map.getLayer(circleLayerId)) map.removeLayer(circleLayerId) } catch { /* noop */ }
      try { if (map.getLayer(symbolLayerId)) map.removeLayer(symbolLayerId) } catch { /* noop */ }
      try { if (map.getSource(sourceId)) map.removeSource(sourceId) } catch { /* noop */ }
    }

    const addLayers = () => {
      if (cancelled || running) return
      running = true
      try {
        cleanupCurrent()
        const data = buildData()
        map.addSource(sourceId, { type: 'geojson', data })
        map.addLayer({ id: heatLayerId, type: 'heatmap', source: sourceId, paint: { 'heatmap-color': [ 'interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(33,102,172,0)', 0.2, '#4faec4', 0.4, '#87ccdb', 0.6, '#f4e288', 0.8, '#edc94a', 1, '#d4b138' ], 'heatmap-intensity': 0.8, 'heatmap-radius': 24 } })
        map.addLayer({ id: circleLayerId, type: 'circle', source: sourceId, filter: ['==', ['get', 'kind'], 'church'], paint: { 'circle-color': '#22c55e', 'circle-radius': 0 } })
        if (!map.hasImage('church-pin')) {
          const canvas = document.createElement('canvas')
          canvas.width = 32; canvas.height = 32
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = '#22c55e'
          ctx.beginPath(); ctx.arc(16, 16, 8, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', 16, 16)
          const imgData = ctx.getImageData(0,0,32,32)
          map.addImage('church-pin', imgData, { pixelRatio: 2 })
        }
        map.addLayer({ id: symbolLayerId, type: 'symbol', source: sourceId, filter: ['==', ['get', 'kind'], 'church'], layout: { 'icon-image': 'church-pin', 'icon-size': 1, 'icon-allow-overlap': true } })
        // Bind hovers
        map.on('mousemove', heatLayerId, onMouseMove)
        map.on('mouseleave', heatLayerId, onMouseLeave)
        map.on('mousemove', symbolLayerId, onMouseMoveChurch)
        map.on('mouseleave', symbolLayerId, onMouseLeaveChurch)
      } catch {
        // noop
      } finally {
        running = false
      }
    }

    // Add now if style is ready, otherwise wait and also re-add on future style loads
    try { map.on('style.load', addLayers) } catch { /* noop */ }

    const isStyleLoaded = () => {
      try { return typeof map.isStyleLoaded === 'function' && map.isStyleLoaded() } catch { return false }
    }

    if (isStyleLoaded()) {
      addLayers()
    } else {
      // Safety: poll in case style.load event was missed
      const start = Date.now()
      const poll = () => {
        if (cancelled) return
        if (isStyleLoaded()) { addLayers(); return }
        if (Date.now() - start > 1500) { addLayers(); return }
        requestAnimationFrame(poll)
      }
      requestAnimationFrame(poll)
    }

    return () => {
      cancelled = true
      try { map.off('style.load', addLayers) } catch { /* noop */ }
      cleanupCurrent()
    }
  }, [mapRef])

  // Update data when points change without tearing down layers
  React.useEffect(() => {
    const map = mapRef.current?.getMap?.() as MLMap | undefined
    if (!map) return
    const sourceId = 'mock-distribution'
    const data: FeatureCollection<Point, { intensity: number; kind: 'distribution' | 'church'; count: number; village: string; startedAt: string }> = {
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: {
          intensity: p.intensity ?? 0.6,
          kind: (p.kind ?? 'distribution') as 'distribution' | 'church',
          count: p.count ?? 0,
          village: p.village ?? '',
          startedAt: p.startedAt ?? ''
        }
      }))
    }
    try {
      const src = map.getSource(sourceId) as unknown as { setData?: (d: FeatureCollection<Point>) => void } | undefined
      src?.setData?.(data)
    } catch {
      // source may not exist yet; it will be added on style.load
    }
  }, [mapRef, points])

  return null
}

export const PartnerOrgDistributionPage: React.FC = () => {
  const data = usePartnerOrgData()
  const [projectId, setProjectId] = React.useState<string>(data.projects[0]?.id ?? '')
  React.useEffect(() => {
    if (!data.projects.find(p => p.id === projectId)) setProjectId(data.projects[0]?.id ?? '')
  }, [data.projects, projectId])

  const totalDistributed = data.summary.biblesDistributed
  const totalListeningHrs = data.summary.listeningHours
  const churchesPlanted = data.summary.churchesPlanted

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      {/* Full-viewport map background */}
      <div className="absolute inset-0">
        <MapShell countriesEnabled={false}>
          <DistributionLayers points={data.distributionPoints} />
        </MapShell>
      </div>

      {/* Floating overlay UI */}
      <div className="absolute top-4 left-4 right-4 md:right-auto z-10">
        {/* Project selector */}
        <div className="max-w-md">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span>{data.projects.find(p => p.id === projectId) ? `${data.projects.find(p => p.id === projectId)!.language} • ${data.projects.find(p => p.id === projectId)!.project} • ${data.projects.find(p => p.id === projectId)!.version}` : '—'}</span>
            <span className="text-neutral-400">▾</span>
          </div>
          <Select value={projectId} onValueChange={setProjectId} placeholder="Select project" className="mt-2">
            {data.projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{`${p.language} • ${p.project} • ${p.version}`}</SelectItem>
            ))}
          </Select>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
          <Card className="border border-neutral-200 dark:border-neutral-800">
            <CardHeader><CardTitle className="text-sm text-neutral-500">Bibles Distributed</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{totalDistributed.toLocaleString()}</div></CardContent>
          </Card>
          <Card className="border border-neutral-200 dark:border-neutral-800">
            <CardHeader><CardTitle className="text-sm text-neutral-500">Total Listening Time</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{totalListeningHrs.toLocaleString()} hrs</div></CardContent>
          </Card>
          <Card className="border border-neutral-200 dark:border-neutral-800">
            <CardHeader><CardTitle className="text-sm text-neutral-500">Churches Planted</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{churchesPlanted}</div></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PartnerOrgDistributionPage


