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
        .select('id,name,level,boundary')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as RegionRow
    },
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

  // Focus map on mount/update with robust bbox from geometry structure
  React.useEffect(() => {
    const boundary = regionQuery.data?.boundary as unknown
    if (!boundary) return
    const box = bboxOf(boundary as any)
    if (box) fitBounds(box, { padding: 60, maxZoom: 7 })
  }, [regionQuery.data, fitBounds])

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


