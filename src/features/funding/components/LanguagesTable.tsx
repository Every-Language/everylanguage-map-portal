import React from 'react'
import { DataTable } from '@/shared/components/ui/DataTable'
import type { Column } from '@/shared/components/ui/DataTable'
import { listAvailableLanguages } from '../api/fundingApi'

type Row = { id: string; language_entity_id: string | null; language_name?: string | null; estimated_budget_cents: number | null; status: string | null }

export const LanguagesTable: React.FC<{ onSelect?: (ids: string[]) => void }> = ({ onSelect }) => {
  const [rows, setRows] = React.useState<Row[]>([])
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    listAvailableLanguages({ status: 'available', limit: 100 }).then(setRows).catch(console.error)
  }, [])

  React.useEffect(() => {
    onSelect?.(Object.keys(selected).filter(id => selected[id]))
  }, [selected])

  const columns: Column<Row & { selected?: boolean }>[] = [
    { key: 'selected', header: '', render: (_v, r) => (
      <input type="checkbox" checked={!!selected[r.id]} onChange={(e)=> setSelected(s=> ({...s, [r.id]: e.target.checked}))} />
    ), width: '8' },
    { key: 'language_name', header: 'Language', render: (_v, r) => r.language_name ?? r.language_entity_id ?? '—', sortable: true },
    { key: 'estimated_budget_cents', header: 'Est. budget', render: (v) => v ? `$${(v/100).toLocaleString()}` : '—', sortable: true },
  ]

  return (
    <DataTable data={rows.map(r=> ({...r, selected: !!selected[r.id]}))} columns={columns} />
  )
}

export default LanguagesTable



