import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'

export type SimpleEntity = { id: string; name: string; description?: string }

export function useUserEntities(userId: string | null) {
  const rolesQ = useQuery({
    enabled: !!userId,
    queryKey: ['user-roles', userId],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('context_type,context_id,user_id')
        .eq('user_id', userId as string)
      if (error) throw error
      return (data ?? []) as Array<{ context_type?: string | null; context_id?: string | null; user_id?: string | null }>
    },
  })

  const idSets = React.useMemo(() => {
    const sets: Record<'team' | 'base' | 'project' | 'partner', Set<string>> = {
      team: new Set(), base: new Set(), project: new Set(), partner: new Set(),
    }
    for (const r of rolesQ.data ?? []) {
      const raw = (r.context_type ?? '') as string
      const t = raw.trim().toLowerCase()
      const id = (r.context_id ?? '') as string
      if (!id) continue
      if (t === 'team') sets.team.add(id)
      else if (t === 'base') sets.base.add(id)
      else if (t === 'project') sets.project.add(id)
      else if (t === 'partner' || t === 'partner_org' || t === 'partner_orgs') sets.partner.add(id)
    }
    return sets
  }, [rolesQ.data])

  const teamsQ = useQuery({
    enabled: idSets.team.size > 0,
    queryKey: ['entities-teams', Array.from(idSets.team).sort().join(',')],
    staleTime: 300_000,
    queryFn: async () => {
      const ids = Array.from(idSets.team)
      const { data, error } = await supabase.from('teams').select('id,name').in('id', ids)
      if (error) throw error
      return (data ?? []).map(r => ({ id: String((r as { id?: string }).id), name: String((r as { name?: string | null }).name ?? '') })) as SimpleEntity[]
    },
  })

  const basesQ = useQuery({
    enabled: idSets.base.size > 0,
    queryKey: ['entities-bases', Array.from(idSets.base).sort().join(',')],
    staleTime: 300_000,
    queryFn: async () => {
      const ids = Array.from(idSets.base)
      const { data, error } = await supabase.from('bases').select('id,name').in('id', ids)
      if (error) throw error
      return (data ?? []).map(r => ({ id: String((r as { id?: string }).id), name: String((r as { name?: string | null }).name ?? '') })) as SimpleEntity[]
    },
  })

  const projectsQ = useQuery({
    enabled: idSets.project.size > 0,
    queryKey: ['entities-projects', Array.from(idSets.project).sort().join(',')],
    staleTime: 300_000,
    queryFn: async () => {
      const ids = Array.from(idSets.project)
      const { data, error } = await supabase.from('projects').select('id,name').in('id', ids)
      if (error) throw error
      return (data ?? []).map(r => ({ id: String((r as { id?: string }).id), name: String((r as { name?: string | null }).name ?? '') })) as SimpleEntity[]
    },
  })

  const partnersQ = useQuery({
    enabled: idSets.partner.size > 0,
    queryKey: ['entities-partners', Array.from(idSets.partner).sort().join(',')],
    staleTime: 300_000,
    queryFn: async () => {
      const ids = Array.from(idSets.partner)
      // partner_orgs might not be in generated types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from('partner_orgs').select('id,name').in('id', ids)
      if (error) throw error
      return (data ?? []).map((r: { id?: string; name?: string | null }) => ({ id: String(r.id), name: String(r.name ?? '') })) as SimpleEntity[]
    },
  })

  const isLoading = rolesQ.isLoading || teamsQ.isLoading || basesQ.isLoading || projectsQ.isLoading || partnersQ.isLoading
  const loading = {
    roles: rolesQ.isLoading,
    teams: rolesQ.isLoading || teamsQ.isLoading,
    bases: rolesQ.isLoading || basesQ.isLoading,
    projects: rolesQ.isLoading || projectsQ.isLoading,
    partners: rolesQ.isLoading || partnersQ.isLoading,
  }

  return {
    roles: rolesQ.data ?? [],
    teams: teamsQ.data ?? [],
    bases: basesQ.data ?? [],
    projects: projectsQ.data ?? [],
    partners: partnersQ.data ?? [],
    isLoading,
    loading,
  }
}


