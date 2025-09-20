import React from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/services/supabase'

export const PartnerOrgLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const partner = useQuery({
    queryKey: ['partner-org', id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('partner_orgs')
        .select('id,name,description')
        .eq('id', id as string)
        .single()
      if (error) throw error
      return data as { id?: string | null; name?: string | null; description?: string | null }
    },
    enabled: !!id,
  })

  const tabs: Array<{ to: string; label: string }> = React.useMemo(() => (
    [
      { to: `/partner-org/${encodeURIComponent(id ?? '')}/dashboard`, label: 'Dashboard' },
      { to: `/partner-org/${encodeURIComponent(id ?? '')}/progress`, label: 'Translation Progress' },
      { to: `/partner-org/${encodeURIComponent(id ?? '')}/distribution`, label: 'Distribution' },
      { to: `/partner-org/${encodeURIComponent(id ?? '')}/funding`, label: 'Funding' },
      { to: `/partner-org/${encodeURIComponent(id ?? '')}/updates`, label: 'Updates' },
    ]
  ), [id])

  const activeTabLabel = React.useMemo(() => {
    const current = tabs.find((t) => location.pathname.startsWith(t.to))
    return current?.label
  }, [location.pathname, tabs])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500"><Link to="/dashboard" className="hover:underline">Dashboard</Link> / {partner.data?.name ?? '—'}{activeTabLabel && activeTabLabel !== 'Dashboard' ? <> / {activeTabLabel}</> : null}</div>
            <h1 className="text-2xl font-bold">{partner.data?.name ?? 'Partner Organization'}</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 dark:border-neutral-800">
          <nav className="-mb-px flex gap-4 overflow-x-auto">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) => `whitespace-nowrap px-3 py-2 text-sm border-b-2 ${isActive ? 'border-accent-600 text-neutral-900 dark:text-neutral-100' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Routed content */}
        <Outlet />
      </div>
    </div>
  )
}

export default PartnerOrgLayout


