import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { useMapContext } from '../../context/MapContext'
import { useSelection, useSetSelection } from '../state/inspectorStore'
import { useNavigate } from 'react-router-dom'
import { bboxOf } from '../utils/geo'
import Fuse from 'fuse.js'
import { Input } from '@/shared/components/ui/Input'
import { LanguageCard } from '@/shared/components/LanguageCard'
import { Search as SearchIcon } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface RegionViewProps { id: string }

type RegionRow = {
  id: string
  name: string
  level: string
  boundary: unknown | null
  aliases: string[]
}

type RegionProperty = { id: string; key: string; value: string }

export const RegionView: React.FC<RegionViewProps> = ({ id }) => {
  const { fitBounds } = useMapContext()
  const setSelection = useSetSelection(); void setSelection
  const navigate = useNavigate()
  const selection = useSelection()
  const [query, setQuery] = React.useState('')

  const regionQuery = useQuery({
    queryKey: ['region', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id,name,level,region_aliases(alias_name)')
        .eq('id', id)
        .single()
      if (error) throw error
      const row = data as unknown as { id: string; name: string; level: string; region_aliases?: Array<{ alias_name: string | null }> }
      const aliases = (row.region_aliases ?? [])
        .map(a => a.alias_name)
        .filter((v): v is string => !!v)
      return { id: row.id, name: row.name, level: row.level, boundary: null, aliases } as RegionRow
    },
  })

  // Prefer a lightweight bbox RPC if available to avoid fetching heavy geometries
  const regionBboxQuery = useQuery({
    queryKey: ['region_bbox', id],
    queryFn: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_region_bbox_by_id', { p_region_id: id })
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

  // Fallback to fetching boundary only if bbox RPC isn't available
  const regionBoundaryQuery = useQuery({
    enabled: regionBboxQuery.isFetched && !regionBboxQuery.data,
    queryKey: ['region_boundary_simplified', id],
    queryFn: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_region_boundary_simplified_by_id', { p_region_id: id, p_tolerance: null })
        if (error || !data) return null
        const row = Array.isArray(data) && data.length > 0 ? data[0] as { boundary?: unknown } : null
        return (row?.boundary ?? null) as unknown | null
      } catch {
        return null as unknown | null
      }
    },
    staleTime: 30 * 60 * 1000,
  })

  const propsQuery = useQuery({
    queryKey: ['region_properties', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('region_properties')
        .select('id,key,value')
        .eq('region_id', id)
      if (error) throw error
      return (data ?? []) as RegionProperty[]
    },
  })

  const langsQuery = useQuery({
    queryKey: ['region_languages', id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('list_languages_for_region', { p_region_id: id, p_include_descendants: true })
      if (error) throw error
      const items = (data ?? []) as Array<{ id: string; name: string; level: string }>
      return items
    },
    staleTime: 10 * 60 * 1000,
  })

  const filteredLanguages = React.useMemo(() => {
    const items = langsQuery.data ?? []
    const trimmed = query.trim()
    if (!trimmed) return items
    const fuse = new Fuse(items, { keys: ['name'], threshold: 0.35, ignoreLocation: true })
    return fuse.search(trimmed).map(r => r.item)
  }, [langsQuery.data, query])

  // Virtualize languages list when large
  const useVirtual = (filteredLanguages.length > 50)
  const parentRef = React.useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? filteredLanguages.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  })

  // Focus map using lightweight bbox when available, otherwise fall back to boundary
  React.useEffect(() => {
    const bbox = regionBboxQuery.data
    if (bbox) {
      fitBounds(bbox, { padding: 60, maxZoom: 7 })
      return
    }
    const boundary = regionBoundaryQuery.data
    if (!boundary) return
    const box = bboxOf(boundary as GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry)
    if (box) fitBounds(box, { padding: 60, maxZoom: 7 })
  }, [regionBboxQuery.data, regionBoundaryQuery.data, fitBounds])

  if (regionQuery.isLoading) return <div>Loading region…</div>
  if (regionQuery.error) return <div className="text-red-600">Failed to load region.</div>

  return (
    <div className="space-y-4">
      <div>
        <div className="font-semibold mb-1">Also known as</div>
        {regionQuery.data?.aliases.length ? (
          <div className="text-sm">{regionQuery.data.aliases.join(', ')}</div>
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

      <div>
        <div className="font-semibold mb-1">Languages</div>
        <div className="mb-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search languages…"
            leftIcon={<SearchIcon className="w-4 h-4" />}
            size="sm"
          />
        </div>
        {useVirtual ? (
          <div ref={parentRef} className="relative h-[360px] overflow-auto">
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map(v => {
                const l = filteredLanguages[v.index]
                return (
                  <div key={l.id} className="absolute top-0 left-0 w-full p-0.5" style={{ transform: `translateY(${v.start}px)` }}>
                    <LanguageCard
                      language={{ id: l.id, name: l.name, level: l.level }}
                      isSelected={selection?.kind === 'language_entity' && selection.id === l.id}
                      onClick={(lid) => navigate(`/map/language/${encodeURIComponent(lid)}`)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filteredLanguages.map(l => (
              <LanguageCard
                key={l.id}
                language={{ id: l.id, name: l.name, level: l.level }}
                isSelected={selection?.kind === 'language_entity' && selection.id === l.id}
                onClick={(lid) => navigate(`/map/language/${encodeURIComponent(lid)}`)}
              />
            ))}
          </div>
        )}
        {(langsQuery.data?.length ?? 0) > 0 && filteredLanguages.length === 0 && (
          <div className="text-sm text-neutral-500">No languages match "{query}"</div>
        )}
        {(langsQuery.data?.length ?? 0) === 0 && (
          <div className="text-sm text-neutral-500">No linked languages</div>
        )}
      </div>
    </div>
  )
}


