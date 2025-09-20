import React from 'react'
import { useAuth } from '@/features/auth'
import { useNavigate, Navigate } from 'react-router-dom'
import { useUserEntities } from '@/features/dashboard/hooks/useUserEntities'

const EntitySelector: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { teams, bases, projects, partners, isLoading, loading } = useUserEntities(user?.id ?? null)

  const Card: React.FC<{ title: string; items: Array<{ id?: string | null; name?: string | null; description?: string | null }>; onClick: (id: string) => void; loading?: boolean }>
    = ({ title, items, onClick, loading: isCardLoading }) => (
    <div className="rounded-2xl p-4 sm:p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="text-sm font-semibold mb-3">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isCardLoading && (
          Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 animate-pulse"
            >
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-2" />
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2" />
            </div>
          ))
        )}
        {!isCardLoading && items.map((i) => (
          <button
            key={String(i.id)}
            onClick={() => i.id && onClick(String(i.id))}
            className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left"
          >
            <div className="font-medium">{i.name ?? i.id}</div>
            {i.description && (
              <div className="text-xs text-neutral-500 line-clamp-2">{i.description}</div>
            )}
          </button>
        ))}
        {!isCardLoading && items.length === 0 && (
          <div className="text-sm text-neutral-500">No items</div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        <InlineWelcome />
        {isLoading && (
          <div className="text-sm text-neutral-500">Loading your entities…</div>
        )}
        <Card title="Teams" items={teams} loading={loading?.teams} onClick={(id) => navigate(`/team/${encodeURIComponent(id)}/dashboard`)} />
        <Card title="Bases" items={bases} loading={loading?.bases} onClick={(id) => navigate(`/base/${encodeURIComponent(id)}/dashboard`)} />
        <Card title="Projects" items={projects} loading={loading?.projects} onClick={(id) => navigate(`/project/${encodeURIComponent(id)}/dashboard`)} />
        <Card title="Partner Organizations" items={partners} loading={loading?.partners} onClick={(id) => navigate(`/partner-org/${encodeURIComponent(id)}/dashboard`)} />
      </div>
    </div>
  )
}

export const DashboardLandingPage: React.FC = () => {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>
  if (!user) return <Navigate to="/login?next=/dashboard&section=dashboard" replace state={{ intendedSection: 'dashboard' }} />
  return <EntitySelector />
}

const InlineWelcome: React.FC = () => {
  const { user } = useAuth()
  const first = (user?.user_metadata as { first_name?: string })?.first_name ?? ''
  const last = (user?.user_metadata as { last_name?: string })?.last_name ?? ''
  const name = `${first} ${last}`.trim() || (user?.email ?? 'there')
  return (
    <div>
      <div className="text-sm text-neutral-500">Welcome back</div>
      <div className="text-2xl font-bold">{name}!</div>
    </div>
  )
}


