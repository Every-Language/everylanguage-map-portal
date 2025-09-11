import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { useMapContext } from '../../context/MapContext'
import { useSetSelection } from '../state/inspectorStore'
import { bboxOf, unionBbox } from '../utils/geo'
// import { useNavigate } from 'react-router-dom'
import { fetchAudioVersionCoveragesForLanguageIds, fetchTextVersionCoveragesForLanguageIds, maxCoveragePercent } from '@/features/bible-content/queries/progress'
// import Fuse from 'fuse.js'
// import { Input } from '@/shared/components/ui/Input'
import { useVirtualizer } from '@tanstack/react-virtual'
// import { RegionCard } from '@/shared/components/RegionCard'
// import { Search as SearchIcon } from 'lucide-react'
import {
  fetchLanguageUsageByCountryMV,
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

  const regionsQuery = useQuery({
    enabled: !!descendantsQuery.data,
    queryKey: ['language_regions_aggregated', id, descendantsQuery.data?.join(',')],
    queryFn: async () => {
      const langIds = descendantsQuery.data ?? [id]
      const { data, error } = await supabase
        .from('language_entities_regions')
        .select('regions(id,name,level,boundary)')
        .in('language_entity_id', langIds)
      if (error) throw error
      const items = (data ?? []).map((r: { regions: { id: string; name: string; level: string; boundary: unknown } }) => ({
        id: r.regions.id,
        name: r.regions.name,
        level: r.regions.level,
        boundary: (r.regions.boundary ?? null) as GeoJSON.Geometry | null,
      }))
      // Deduplicate by region id
      const dedup = new Map<string, { id: string; name: string; level: string; boundary: GeoJSON.Geometry | null }>()
      for (const it of items) if (!dedup.has(it.id)) dedup.set(it.id, it)
      return Array.from(dedup.values())
    }
  })

  const filteredRegions = React.useMemo(() => (regionsQuery.data ?? []), [regionsQuery.data])

  // Virtualize regions list when large
  const useVirtual = (filteredRegions.length > 50); void useVirtual
  const parentRef = React.useRef<HTMLDivElement | null>(null); void parentRef
  const rowVirtualizer = useVirtualizer({
    count: 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    overscan: 10,
  }); void rowVirtualizer

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

  // Focus map on union of region boundaries (robust to different shapes)
  React.useEffect(() => {
    const boxes = (regionsQuery.data ?? [])
      .map(r => r.boundary)
      .filter(Boolean)
      .map((g) => bboxOf(g as GeoJSON.Geometry))
      .filter((b): b is [number, number, number, number] => !!b)
    const box = unionBbox(boxes)
    if (box) fitBounds(box, { padding: 80, maxZoom: 7 })
  }, [regionsQuery.data, fitBounds])

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
  const [showDescendants, setShowDescendants] = React.useState(true)
  const langIds = React.useMemo(() => (showDescendants ? descendantLanguageIds : [languageId]), [showDescendants, descendantLanguageIds, languageId])

  const downloads = useQuery({
    enabled: langIds.length > 0,
    queryKey: ['analytics-language-usage-mv', languageId, showDescendants, langIds.join(',')],
    queryFn: () => fetchLanguageUsageByCountryMV(langIds),
    staleTime: 5 * 60 * 1000,
  })

  const toCountryName = React.useCallback((code: string | null) => {
    if (!code) return 'Unknown'
    const map: Record<string, string> = { US: 'United States', GB: 'United Kingdom', AU: 'Australia', CA: 'Canada', IN: 'India' }
    return map[code] ?? code
  }, [])

  type CombinedRow = { country_code: string | null; country: string; downloads: number; listened_minutes: number; top_chapters: string }
  const combinedCols: Column<CombinedRow>[] = [
    { key: 'country', header: 'Country', sortable: true },
    { key: 'downloads', header: 'Users', sortable: true },
    { key: 'listened_minutes', header: 'Listen Time', sortable: true },
    { key: 'top_chapters', header: 'Popular Chapters' },
  ]

  const combinedRowsAll: CombinedRow[] = React.useMemo(() => {
    const src = downloads.data ?? []
    const rows: CombinedRow[] = src.map(r => ({
      country_code: r.country_code,
      country: toCountryName(r.country_code),
      downloads: Number(r.downloads_total ?? 0),
      listened_minutes: Math.round(Number(r.listened_total_seconds ?? 0) / 60),
      top_chapters: (r.top_chapters ?? []).join(', '),
    }))
    rows.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    return rows
  }, [downloads.data, toCountryName])

  const topCombinedRows = React.useMemo(() => combinedRowsAll.slice(0, 5), [combinedRowsAll])

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
          columns={combinedCols}
          searchable={false}
          loading={downloads.isLoading}
          emptyMessage="No usage data"
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


