import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { useMapContext } from '../../context/MapContext'
import { useSetSelection } from '../state/inspectorStore'
import { bboxOf, unionBbox } from '../utils/geo'

interface LanguageEntityViewProps { id: string }

type LanguageEntity = { id: string; name: string; level: string }
type LanguageProperty = { id: string; key: string; value: string }

export const LanguageEntityView: React.FC<LanguageEntityViewProps> = ({ id }) => {
  const { fitBounds } = useMapContext()
  const setSelection = useSetSelection()

  const entityQuery = useQuery({
    queryKey: ['language_entity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities')
        .select('id,name,level')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as LanguageEntity
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
    queryKey: ['language_regions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities_regions')
        .select('regions(id,name,level,boundary)')
        .eq('language_entity_id', id)
      if (error) throw error
      // Supabase client returns 'unknown' for JSON; cast after runtime filtering
      return (data ?? []).map((r: { regions: { id: string; name: string; level: string; boundary: unknown } }) => ({
        id: r.regions.id,
        name: r.regions.name,
        level: r.regions.level,
        boundary: (r.regions.boundary ?? null) as GeoJSON.Geometry | null,
      }))
    }
  })

  // Focus map on union of region boundaries (robust to different shapes)
  React.useEffect(() => {
    const boxes = (regionsQuery.data ?? [])
      .map(r => r.boundary)
      .filter(Boolean)
      .map((g) => bboxOf(g as any))
      .filter((b): b is [number, number, number, number] => !!b)
    const box = unionBbox(boxes)
    if (box) fitBounds(box, { padding: 80, maxZoom: 7 })
  }, [regionsQuery.data, fitBounds])

  if (entityQuery.isLoading) return <div>Loading language…</div>
  if (entityQuery.error) return <div className="text-red-600">Failed to load language.</div>
  const entity = entityQuery.data!

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">{entity.name}</div>
        <div className="text-xs uppercase tracking-wide text-neutral-500">{entity.level}</div>
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
        <div className="font-semibold mb-1">Countries</div>
        <ul className="text-sm space-y-1">
          {regionsQuery.data?.map(r => (
            <li key={r.id}>
              <button className="underline" onClick={() => setSelection({ kind: 'region', id: r.id }, { pushRoute: true, focusMap: true })}>
                {r.name}
              </button>
            </li>
          ))}
          {regionsQuery.data?.length === 0 && <li className="text-neutral-500">No linked countries</li>}
        </ul>
      </div>
    </div>
  )
}


