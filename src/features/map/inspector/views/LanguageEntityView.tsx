import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { useMapContext } from '../../context/MapContext'
import { useSetSelection } from '../state/inspectorStore'
import { bboxOf } from '../utils/geo'
import { useNavigate } from 'react-router-dom'
import { fetchAudioVersionCoveragesForLanguageIds, fetchTextVersionCoveragesForLanguageIds, maxCoveragePercent } from '@/features/map/inspector/queries/progress'
// import Fuse from 'fuse.js'
// import { RegionCard } from '@/shared/components/RegionCard'
// import { Search as SearchIcon } from 'lucide-react'
import {
  fetchLanguageUsageByRegionMV,
  type LanguageUsageByRegion,
} from '@/features/map/analytics/api'
import { DataTable, type Column } from '@/shared/components/ui/DataTable'

interface LanguageEntityViewProps { id: string }

type LanguageEntity = { id: string; name: string; level: string; aliases: string[] }
type LanguageProperty = { id: string; key: string; value: string }

export const LanguageEntityView: React.FC<LanguageEntityViewProps> = ({ id }) => {
  const { fitBounds } = useMapContext()
  const setSelection = useSetSelection(); void setSelection

  const entityQuery = useQuery({
    queryKey: ['language_entity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities')
        .select('id,name,level,language_aliases(alias_name)')
        .eq('id', id)
        .single()
      if (error) throw error
      const row = data as unknown as { id: string; name: string; level: string; language_aliases?: Array<{ alias_name: string | null }> }
      const aliases = (row.language_aliases ?? [])
        .map(a => a.alias_name)
        .filter((v): v is string => !!v)
      return { id: row.id, name: row.name, level: row.level, aliases } as LanguageEntity
    }
  })

  // Pick a single primary region for this language by highest dominance-related metric
  const primaryRegionQuery = useQuery({
    queryKey: ['language_primary_region', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities_regions')
        // Select all columns from join row to inspect dominance-related fields dynamically; avoid heavy region geometry
        .select('*,regions(id)')
        .eq('language_entity_id', id)
      if (error) throw error
      type Row = { regions?: { id?: string | null } | null } & Record<string, unknown>
      const rows = (data ?? []) as Row[]
      if (!rows.length) return null as { regionId: string } | null
      const dominanceKeys: Array<{ key: string; weight: number; preferHigher: boolean }> = [
        { key: 'dominance_level', weight: 1, preferHigher: true },
        { key: 'dominance', weight: 1, preferHigher: true },
        { key: 'speaker_share', weight: 1, preferHigher: true },
        { key: 'share', weight: 1, preferHigher: true },
        { key: 'weight', weight: 1, preferHigher: true },
        { key: 'percent_speakers', weight: 1, preferHigher: true },
        // Booleans indicating primacy
        { key: 'is_primary', weight: 1000, preferHigher: true },
        { key: 'primary', weight: 1000, preferHigher: true },
        // If there is a rank field, prefer lower rank
        { key: 'rank', weight: 1, preferHigher: false },
        { key: 'dominance_rank', weight: 1, preferHigher: false },
      ]
      const scoreRow = (row: Row): number => {
        let score = 0
        for (const cfg of dominanceKeys) {
          const v = row[cfg.key]
          if (typeof v === 'number' && Number.isFinite(v)) {
            score += cfg.preferHigher ? v * cfg.weight : -v * cfg.weight
          } else if (typeof v === 'boolean') {
            score += (v ? 1 : 0) * cfg.weight
          } else if (typeof v === 'string') {
            const parsed = Number(v)
            if (!Number.isNaN(parsed)) score += (cfg.preferHigher ? parsed : -parsed) * cfg.weight
          }
        }
        return score
      }
      let best: Row | null = null
      let bestScore = -Infinity
      for (const r of rows) {
        const sc = scoreRow(r)
        if (sc > bestScore) { best = r; bestScore = sc }
      }
      const regionId = (best?.regions?.id ?? null) as string | null
      if (!regionId) return null
      return { regionId }
    },
    staleTime: 10 * 60 * 1000,
  })

  // Fetch bbox for the primary region via RPC for lightweight map focus
  const primaryRegionBboxQuery = useQuery({
    enabled: !!primaryRegionQuery.data?.regionId,
    queryKey: ['language_primary_region_bbox', id, primaryRegionQuery.data?.regionId ?? null],
    queryFn: async () => {
      const regionId = primaryRegionQuery.data?.regionId
      if (!regionId) return null as [number, number, number, number] | null
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_region_bbox_by_id', { p_region_id: regionId })
        if (error || !data) return null as [number, number, number, number] | null
        const row = Array.isArray(data) && data.length > 0 ? data[0] as { min_lon?: number; min_lat?: number; max_lon?: number; max_lat?: number } : null
        if (!row) return null
        const minx = Number(row.min_lon)
        const miny = Number(row.min_lat)
        const maxx = Number(row.max_lon)
        const maxy = Number(row.max_lat)
        if ([minx, miny, maxx, maxy].every((n) => Number.isFinite(n))) return [minx, miny, maxx, maxy] as [number, number, number, number]
        return null as [number, number, number, number] | null
      } catch {
        return null as [number, number, number, number] | null
      }
    },
    staleTime: 30 * 60 * 1000,
  })

  // Fallback: simplified boundary for the primary region (mirrors RegionView)
  const primaryRegionBoundaryQuery = useQuery({
    enabled: !!primaryRegionQuery.data?.regionId && primaryRegionBboxQuery.isFetched && !primaryRegionBboxQuery.data,
    queryKey: ['language_primary_region_boundary_simplified', primaryRegionQuery.data?.regionId ?? null],
    queryFn: async () => {
      const regionId = primaryRegionQuery.data?.regionId
      if (!regionId) return null as unknown | null
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_region_boundary_simplified_by_id', { p_region_id: regionId, p_tolerance: null })
        if (error || !data) return null
        const row = Array.isArray(data) && data.length > 0 ? data[0] as { boundary?: unknown } : null
        return (row?.boundary ?? null) as unknown | null
      } catch {
        return null as unknown | null
      }
    },
    staleTime: 30 * 60 * 1000,
  })

  // Fetch descendants (children at all depths) plus self to aggregate data across the whole language family
  const descendantsQuery = useQuery({
    queryKey: ['language-descendants', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_language_entity_hierarchy', {
        entity_id: id,
        generations_up: 0,
        generations_down: 6,
      })
      if (error) throw error
      const rows = (data ?? []) as Array<{
        hierarchy_entity_id: string
        relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling'
      }>
      const ids = new Set<string>()
      for (const r of rows) {
        if (r.relationship_type === 'self' || r.relationship_type === 'descendant') ids.add(r.hierarchy_entity_id)
      }
      // Ensure self id is present even if hierarchy function returns empty
      ids.add(id)
      const arr = Array.from(ids)
      arr.sort() // stabilize
      return arr
    }
  })

  const propsQuery = useQuery({
    queryKey: ['language_properties', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_properties')
        .select('id,key,value')
        .eq('language_entity_id', id)
      if (error) throw error
      return (data ?? []) as LanguageProperty[]
    }
  })

  // Removed union-of-linked-regions focus and virtualization. Camera focuses on primary region only.

  // Bible translation progress (best versions per language, then summaries)
  // All versions with summaries (for progress ring + table)
  const audioVersions = useQuery({
    enabled: !!descendantsQuery.data,
    queryKey: ['all-audio-coverages-aggregated', id, descendantsQuery.data?.join(',')],
    queryFn: () => fetchAudioVersionCoveragesForLanguageIds(descendantsQuery.data ?? [id])
  })
  const textVersions = useQuery({
    enabled: !!descendantsQuery.data,
    queryKey: ['all-text-coverages-aggregated', id, descendantsQuery.data?.join(',')],
    queryFn: () => fetchTextVersionCoveragesForLanguageIds(descendantsQuery.data ?? [id])
  })

  // Focus map: prefer primary region bbox; fallback to simplified boundary
  React.useEffect(() => {
    const regionId = primaryRegionQuery.data?.regionId
    const primaryBox = primaryRegionBboxQuery.data
    if (primaryBox) {
      console.info('[LanguageEntityView] focusing using primary region bbox RPC', { regionId, bbox: primaryBox })
      fitBounds(primaryBox, { padding: 60, maxZoom: 7 })
      return
    }
    const boundary = primaryRegionBoundaryQuery.data
    if (boundary) {
      const box = bboxOf(boundary as GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry)
      if (box) {
        console.info('[LanguageEntityView] focusing using primary region simplified boundary bbox', { regionId, bbox: box })
        fitBounds(box, { padding: 60, maxZoom: 7 })
        return
      }
    }
    console.info('[LanguageEntityView] no primary region geometry available for focus', { regionId })
  }, [primaryRegionBboxQuery.data, primaryRegionBoundaryQuery.data, primaryRegionQuery.data?.regionId, fitBounds])

  if (entityQuery.isLoading) return <div>Loading language…</div>
  if (entityQuery.error) return <div className="text-red-600">Failed to load language.</div>

  return (
    <div className="space-y-4">
      <div>
        <div className="font-semibold mb-1">Also known as</div>
        {entityQuery.data?.aliases.length ? (
          <div className="text-sm">{entityQuery.data.aliases.join(', ')}</div>
        ) : (
          <div className="text-sm text-neutral-500">No alternate names</div>
        )}
      </div>

      <div>
        <div className="font-semibold mb-1">Stats</div>
        <ul className="text-sm space-y-1">
          {propsQuery.data?.map(p => (
            <li key={p.id}><span className="text-neutral-500 mr-2">{p.key}:</span>{p.value}</li>
          ))}
          {propsQuery.data?.length === 0 && <li className="text-neutral-500">No stats available</li>}
        </ul>
      </div>

      {/* Moved countries list to left column */}

      <div>
        <div className="font-semibold mb-1">Bible Translation Progress</div>
        <div className="space-y-3">
          {/* Audio */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="text-sm font-medium mb-2">Audio</div>
            <div className="flex items-center gap-4">
              <ProgressRing value={Math.round((audioVersions.data && audioVersions.data.length > 0 ? Math.max(...audioVersions.data.map(maxCoveragePercent)) : 0) * 100)} />
              <div className="text-sm text-neutral-500">Progress</div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500">
                    <th className="py-1 pr-3">Version</th>
                    <th className="py-1 pr-3">Books</th>
                    <th className="py-1 pr-3">Chapters</th>
                    <th className="py-1">Verses</th>
                  </tr>
                </thead>
                <tbody>
                  {audioVersions.data?.map(v => (
                    <tr key={v.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="py-1 pr-3">{v.name}</td>
                      <td className="py-1 pr-3">{v.books_complete ?? 0} / {v.books_total ?? 0}</td>
                      <td className="py-1 pr-3">{v.chapters_complete ?? 0} / {v.chapters_total ?? 0}</td>
                      <td className="py-1">{v.verses_complete ?? 0} / {v.verses_total ?? 0}</td>
                    </tr>
                  ))}
                  {audioVersions.data?.length === 0 && (
                    <tr><td className="py-2 text-neutral-500" colSpan={4}>No audio versions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Text */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="text-sm font-medium mb-2">Text</div>
            <div className="flex items-center gap-4">
              <ProgressRing value={Math.round((textVersions.data && textVersions.data.length > 0 ? Math.max(...textVersions.data.map(maxCoveragePercent)) : 0) * 100)} />
              <div className="text-sm text-neutral-500">Progress</div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500">
                    <th className="py-1 pr-3">Version</th>
                    <th className="py-1 pr-3">Books</th>
                    <th className="py-1 pr-3">Chapters</th>
                    <th className="py-1">Verses</th>
                  </tr>
                </thead>
                <tbody>
                  {textVersions.data?.map(v => (
                    <tr key={v.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="py-1 pr-3">{v.name}</td>
                      <td className="py-1 pr-3">{v.books_complete ?? 0} / {v.books_total ?? 0}</td>
                      <td className="py-1 pr-3">{v.chapters_complete ?? 0} / {v.chapters_total ?? 0}</td>
                      <td className="py-1">{v.verses_complete ?? 0} / {v.verses_total ?? 0}</td>
                    </tr>
                  ))}
                  {textVersions.data?.length === 0 && (
                    <tr><td className="py-2 text-neutral-500" colSpan={4}>No text versions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <LanguageAnalyticsTables languageId={id} descendantLanguageIds={descendantsQuery.data ?? [id]} />
    </div>
  )
}

const LanguageAnalyticsTables: React.FC<{ languageId: string; descendantLanguageIds: string[] }> = ({ languageId, descendantLanguageIds }) => {
  const navigate = useNavigate()
  const setSelection = useSetSelection()
  const [showDescendants, setShowDescendants] = React.useState(true)
  const langIds = React.useMemo(() => (showDescendants ? descendantLanguageIds : [languageId]), [showDescendants, descendantLanguageIds, languageId])

  const downloads = useQuery({
    enabled: langIds.length > 0,
    queryKey: ['analytics-language-usage-by-region-mv', languageId, showDescendants, langIds.join(',')],
    queryFn: () => fetchLanguageUsageByRegionMV(langIds),
    staleTime: 5 * 60 * 1000,
  })

  // No country label needed when aggregating by region_id

  type CombinedRow = { region_id: string | null; downloads: number; listened_minutes: number }
  const combinedCols: Column<CombinedRow>[] = [
    { key: 'downloads', header: 'Users', sortable: true },
    { key: 'listened_minutes', header: 'Listen Time', sortable: true },
  ]

  const combinedRowsAll: CombinedRow[] = React.useMemo(() => {
    const src = (downloads.data ?? []) as LanguageUsageByRegion[]
    const rows: CombinedRow[] = src.map(r => ({
      region_id: r.region_id ?? null,
      downloads: Number(r.downloads_total ?? 0),
      listened_minutes: Math.round(Number(r.listened_total_seconds ?? 0) / 60),
    }))
    rows.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    return rows
  }, [downloads.data])

  const topCombinedRows = React.useMemo(() => combinedRowsAll.slice(0, 5), [combinedRowsAll])

  // Fetch region names for display
  const regionIds = React.useMemo(() => {
    const ids = new Set<string>()
    for (const r of topCombinedRows) {
      if (r.region_id) ids.add(r.region_id)
    }
    return Array.from(ids)
  }, [topCombinedRows])
  const regionNamesQuery = useQuery({
    enabled: regionIds.length > 0,
    queryKey: ['region-names', regionIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id,name')
        .in('id', regionIds)
      if (error) throw error
      const map: Record<string, string> = {}
      for (const row of (data ?? []) as Array<{ id?: string | null; name?: string | null }>) {
        if (row.id) map[row.id] = row.name ?? row.id
      }
      return map
    },
    staleTime: 60 * 60 * 1000,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Bible listening data</div>
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={showDescendants} onChange={(e) => setShowDescendants(e.target.checked)} />
          Include descendant languages
        </label>
      </div>

      <div>
        <DataTable
          data={topCombinedRows}
          columns={[
            { key: 'region_id', header: 'Region', sortable: false, render: (_v, row) => {
              const id = row.region_id ?? null
              if (!id) return 'Unknown'
              const name = regionNamesQuery.data?.[id]
              return name ?? id
            } },
            ...combinedCols,
          ]}
          searchable={false}
          loading={downloads.isLoading}
          emptyMessage="No usage data"
          onRowClick={(row) => {
            const regionId = row.region_id ?? null
            if (!regionId) return
            setSelection({ kind: 'region', id: regionId })
            navigate(`/map/region/${encodeURIComponent(regionId)}`)
          }}
        />
      </div>
    </div>
  )
}

const ProgressRing: React.FC<{ value: number }> = ({ value }) => {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 28
  const stroke = 7
  const normalizedRadius = radius - stroke
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (clamped / 100) * circumference
  return (
    <svg height={radius * 2} width={radius * 2} className="shrink-0">
      <circle
        stroke="currentColor"
        fill="transparent"
        strokeWidth={stroke}
        strokeOpacity={0.2}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        className="text-accent-600"
        stroke="currentColor"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.4s ease' }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-sm fill-current">
        {clamped}%
      </text>
    </svg>
  )
}


