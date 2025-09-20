import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'

export const TeamDashboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const team = useQuery({
    queryKey: ['team', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id,name').eq('id', id as string).single()
      if (error) throw error
      return data as { id?: string | null; name?: string | null }
    },
    enabled: !!id,
  })

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500"><Link to="/dashboard" className="hover:underline">All entities</Link> / Team</div>
            <h1 className="text-2xl font-bold">{team.data?.name ?? 'Team'}</h1>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 text-sm text-neutral-500">
          Dashboard content coming soon.
        </div>
      </div>
    </div>
  )
}

export default TeamDashboardPage


