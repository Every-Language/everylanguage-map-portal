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

interface RegionViewProps { id: string }

type RegionRow = {
  id: string
  name: string
  level: string
  boundary: unknown | null
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
        .select('id,name,level')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as RegionRow
    },
  })

  // Prefer a lightweight bbox RPC if available to avoid fetching heavy geometries
  const regionBboxQuery = useQuery({
    queryKey: ['region_bbox', id],
    queryFn: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_region_bbox', { region_id: id })
        if (error || !data) return null as [number, number, number, number] | null
        if (Array.isArray(data) && data.length === 4) {
          const nums = data.map((n: unknown) => Number(n))
          if (nums.every((n: number) => Number.isFinite(n))) return nums as [number, number, number, number]
        }
        if (typeof data === 'object') {
          const obj = data as Record<string, unknown>
          const minx = Number(obj.minx)
          const miny = Number(obj.miny)
          const maxx = Number(obj.maxx)
          const maxy = Number(obj.maxy)
          if ([minx, miny, maxx, maxy].every((n) => Number.isFinite(n))) return [minx, miny, maxx, maxy] as [number, number, number, number]
        }
        return null as [number, number, number, number] | null
      } catch {
        return null as [number, number, number, number] | null
      }
    },
    staleTime: 300_000,
  })

  // Fallback to fetching boundary only if bbox RPC isn't available
  const regionBoundaryQuery = useQuery({
    enabled: regionBboxQuery.isFetched && !regionBboxQuery.data,
    queryKey: ['region_boundary', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('boundary')
        .eq('id', id)
        .single()
      if (error) return null
      return (data?.boundary ?? null) as unknown | null
    },
    staleTime: 300_000,
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
      // Fetch descendant regions including self
      const { data: hier, error: hierErr } = await supabase.rpc('get_region_hierarchy', {
        region_id: id,
        generations_up: 0,
        generations_down: 6,
      })
      if (hierErr) throw hierErr
      const rows = (hier ?? []) as Array<{ hierarchy_region_id: string; relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling' }>
      const regionIds = new Set<string>([id])
      for (const r of rows) {
        if (r.relationship_type === 'self' || r.relationship_type === 'descendant') regionIds.add(r.hierarchy_region_id)
      }

      const { data, error } = await supabase
        .from('language_entities_regions')
        .select('language_entities(id,name,level),region_id')
        .in('region_id', Array.from(regionIds))
      if (error) throw error
      const items = (data ?? []).map((row: { language_entities: { id: string; name: string; level: string } }) => row.language_entities)
      // Deduplicate languages by id
      const byId = new Map<string, { id: string; name: string; level: string }>()
      for (const l of items) if (!byId.has(l.id)) byId.set(l.id, l)
      return Array.from(byId.values())
    },
  })

  const filteredLanguages = React.useMemo(() => {
    const items = langsQuery.data ?? []
    const trimmed = query.trim()
    if (!trimmed) return items
    const fuse = new Fuse(items, { keys: ['name'], threshold: 0.35, ignoreLocation: true })
    return fuse.search(trimmed).map(r => r.item)
  }, [langsQuery.data, query])

  // Focus map using lightweight bbox when available, otherwise fall back to boundary
  React.useEffect(() => {
    const bbox = regionBboxQuery.data
    if (bbox) {
      fitBounds(bbox, { padding: 60, maxZoom: 7 })
      return
    }
    const boundary = regionBoundaryQuery.data
    if (!boundary) return
    const box = bboxOf(boundary as any)
    if (box) fitBounds(box, { padding: 60, maxZoom: 7 })
  }, [regionBboxQuery.data, regionBoundaryQuery.data, fitBounds])

  if (regionQuery.isLoading) return <div>Loading region…</div>
  if (regionQuery.error) return <div className="text-red-600">Failed to load region.</div>

  return (
    <div className="space-y-4">
      

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
        <div className="grid grid-cols-1 gap-2">
          {filteredLanguages.map(l => (
            <LanguageCard
              key={l.id}
              language={{ id: l.id, name: l.name, level: l.level }}
              isSelected={selection?.kind === 'language_entity' && selection.id === l.id}
              onClick={(lid) => navigate(`/map/language/${encodeURIComponent(lid)}`)}
            />
          ))}
          {(langsQuery.data?.length ?? 0) > 0 && filteredLanguages.length === 0 && (
            <div className="text-sm text-neutral-500">No languages match "{query}"</div>
          )}
          {(langsQuery.data?.length ?? 0) === 0 && (
            <div className="text-sm text-neutral-500">No linked languages</div>
          )}
        </div>
      </div>
    </div>
  )
}


