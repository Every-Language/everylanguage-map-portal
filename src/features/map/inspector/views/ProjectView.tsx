import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'
import { useMapContext } from '../../context/MapContext'
import { bboxOf } from '../utils/geo'

interface ProjectViewProps { id: string }

type ProjectRow = { id: string; name: string; description: string | null; region_id: string | null }

export const ProjectView: React.FC<ProjectViewProps> = ({ id }) => {
  const { fitBounds } = useMapContext()

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,description,region_id')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as ProjectRow
    }
  })

  const regionQuery = useQuery({
    enabled: !!projectQuery.data?.region_id,
    queryKey: ['project_region', projectQuery.data?.region_id],
    queryFn: async () => {
      const regionId = projectQuery.data!.region_id!
      const { data, error } = await supabase
        .from('regions')
        .select('id,name,boundary')
        .eq('id', regionId)
        .single()
      if (error) throw error
      return data as { id: string; name: string; boundary: GeoJSON.Geometry | null }
    }
  })

  React.useEffect(() => {
    const g = regionQuery.data?.boundary
    if (!g) return
    const box = bboxOf(g)
    if (box) fitBounds(box, { padding: 60, maxZoom: 7 })
  }, [regionQuery.data, fitBounds])

  if (projectQuery.isLoading) return <div>Loading project…</div>
  if (projectQuery.error) return <div className="text-red-600">Failed to load project.</div>
  const project = projectQuery.data!

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">{project.name}</div>
      </div>
      {project.description && (
        <div className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{project.description}</div>
      )}

      <div className="text-sm text-neutral-500">More project stats and listening data coming soon.</div>
    </div>
  )
}


