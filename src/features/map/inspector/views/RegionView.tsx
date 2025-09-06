import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { useMapContext } from '../../context/MapContext'
import { useSetSelection } from '../state/inspectorStore'
import { bboxOf } from '../utils/geo'

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
  const setSelection = useSetSelection()

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
      const { data, error } = await supabase
        .from('language_entities_regions')
        .select('language_entities(id,name,level)')
        .eq('region_id', id)
      if (error) throw error
      const items = (data ?? []).map((row: { language_entities: { id: string; name: string; level: string } }) => row.language_entities)
      return items as { id: string; name: string; level: string }[]
    },
  })

  // Focus map on mount/update with robust bbox from geometry structure
  React.useEffect(() => {
    const boundary = regionQuery.data?.boundary as unknown
    if (!boundary) return
    const box = bboxOf(boundary as any)
    if (box) fitBounds(box, { padding: 60, maxZoom: 7 })
  }, [regionQuery.data, fitBounds])

  if (regionQuery.isLoading) return <div>Loading region…</div>
  if (regionQuery.error) return <div className="text-red-600">Failed to load region.</div>
  const region = regionQuery.data!

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">{region.name}</div>
        <div className="text-xs uppercase tracking-wide text-neutral-500">{region.level}</div>
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
        <ul className="text-sm space-y-1">
          {langsQuery.data?.map(l => (
            <li key={l.id}>
              <button className="underline" onClick={() => setSelection({ kind: 'language_entity', id: l.id }, { pushRoute: true, focusMap: true })}>
                {l.name}
              </button>
            </li>
          ))}
          {langsQuery.data?.length === 0 && <li className="text-neutral-500">No linked languages</li>}
        </ul>
      </div>
    </div>
  )
}


