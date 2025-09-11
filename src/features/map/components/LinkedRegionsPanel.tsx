import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { Input } from '@/shared/components/ui/Input'
import { Search as SearchIcon } from 'lucide-react'
import Fuse from 'fuse.js'
import { useVirtualizer } from '@tanstack/react-virtual'
import { RegionCard } from '@/shared/components/RegionCard'
import { useNavigate } from 'react-router-dom'
import { useSelection } from '../inspector/state/inspectorStore'

export const LinkedRegionsPanel: React.FC<{ languageId: string; scrollRef?: React.MutableRefObject<HTMLDivElement | null> }> = ({ languageId, scrollRef }) => {
  const [query, setQuery] = React.useState('')
  const navigate = useNavigate()
  const selection = useSelection()

  const regionsQuery = useQuery({
    queryKey: ['language-linked-regions', languageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities_regions')
        .select('regions(id,name,level,boundary)')
        .eq('language_entity_id', languageId)
      if (error) throw error
      const items = (data ?? []).map((r: { regions: { id: string; name: string; level: string; boundary: unknown } }) => ({
        id: r.regions.id,
        name: r.regions.name,
        level: r.regions.level,
      }))
      // Deduplicate by id
      const dedup = new Map<string, { id: string; name: string; level: string }>()
      for (const it of items) if (!dedup.has(it.id)) dedup.set(it.id, it)
      return Array.from(dedup.values())
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = React.useMemo(() => {
    const items = regionsQuery.data ?? []
    const trimmed = query.trim()
    if (!trimmed) return items
    const fuse = new Fuse(items, { keys: ['name'], threshold: 0.35, ignoreLocation: true })
    return fuse.search(trimmed).map(r => r.item)
  }, [regionsQuery.data, query])

  const useVirtual = (filtered.length > 50)
  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? filtered.length : 0,
    getScrollElement: () => (scrollRef?.current ?? null),
    estimateSize: () => 92,
    overscan: 10,
  })

  return (
    <div className="space-y-2">
      <div className="font-semibold">Countries</div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search countries…"
        leftIcon={<SearchIcon className="w-4 h-4" />}
        size="sm"
      />
      {useVirtual ? (
        <div className="relative" style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(v => {
            const r = filtered[v.index]
            return (
              <div key={r.id} className="absolute top-0 left-0 w-full p-0.5" style={{ transform: `translateY(${v.start}px)` }}>
                <RegionCard
                  region={{ id: r.id, name: r.name, level: r.level }}
                  isSelected={selection?.kind === 'region' && selection.id === r.id}
                  onClick={(rid) => navigate(`/map/region/${encodeURIComponent(rid)}`)}
                />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(r => (
            <RegionCard
              key={r.id}
              region={{ id: r.id, name: r.name, level: r.level }}
              isSelected={selection?.kind === 'region' && selection.id === r.id}
              onClick={(rid) => navigate(`/map/region/${encodeURIComponent(rid)}`)}
            />
          ))}
        </div>
      )}
      {(regionsQuery.data?.length ?? 0) > 0 && filtered.length === 0 && (
        <div className="text-sm text-neutral-500">No countries match "{query}"</div>
      )}
      {(regionsQuery.data?.length ?? 0) === 0 && (
        <div className="text-sm text-neutral-500">No linked countries</div>
      )}
    </div>
  )
}


