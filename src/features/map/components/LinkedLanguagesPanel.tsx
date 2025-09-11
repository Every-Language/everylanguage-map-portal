import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { Input } from '@/shared/components/ui/Input'
import { Search as SearchIcon } from 'lucide-react'
import Fuse from 'fuse.js'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LanguageCard } from '@/shared/components/LanguageCard'
import { useNavigate } from 'react-router-dom'
import { useSelection } from '../inspector/state/inspectorStore'

export const LinkedLanguagesPanel: React.FC<{ regionId: string; scrollRef?: React.MutableRefObject<HTMLDivElement | null> }> = ({ regionId, scrollRef }) => {
  const [query, setQuery] = React.useState('')
  const navigate = useNavigate()
  const selection = useSelection()

  const langsQuery = useQuery({
    queryKey: ['region-linked-languages', regionId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('list_languages_for_region', { p_region_id: regionId, p_include_descendants: true })
      if (error) throw error
      const items = (data ?? []) as Array<{ id: string; name: string; level: string }>
      return items
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = React.useMemo(() => {
    const items = langsQuery.data ?? []
    const trimmed = query.trim()
    if (!trimmed) return items
    const fuse = new Fuse(items, { keys: ['name'], threshold: 0.35, ignoreLocation: true })
    return fuse.search(trimmed).map(r => r.item)
  }, [langsQuery.data, query])

  const useVirtual = (filtered.length > 50)
  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? filtered.length : 0,
    getScrollElement: () => (scrollRef?.current ?? null),
    estimateSize: () => 72,
    overscan: 10,
  })

  return (
    <div className="space-y-2">
      <div className="font-semibold">Languages</div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search languages…"
        leftIcon={<SearchIcon className="w-4 h-4" />}
        size="sm"
      />
      {useVirtual ? (
        <div className="relative" style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(v => {
            const l = filtered[v.index]
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
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(l => (
            <LanguageCard
              key={l.id}
              language={{ id: l.id, name: l.name, level: l.level }}
              isSelected={selection?.kind === 'language_entity' && selection.id === l.id}
              onClick={(lid) => navigate(`/map/language/${encodeURIComponent(lid)}`)}
            />
          ))}
        </div>
      )}
      {(langsQuery.data?.length ?? 0) > 0 && filtered.length === 0 && (
        <div className="text-sm text-neutral-500">No languages match "{query}"</div>
      )}
      {(langsQuery.data?.length ?? 0) === 0 && (
        <div className="text-sm text-neutral-500">No linked languages</div>
      )}
    </div>
  )
}


