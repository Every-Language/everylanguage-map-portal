import React from 'react'
import { DataTable } from '@/shared/components/ui/DataTable'
import type { Column } from '@/shared/components/ui/DataTable'
import { Button } from '@/shared/components/ui/Button'
import { listAvailableLanguages } from '../../api/fundingApi'
import { computeUpfrontMonthly } from '../../utils/calc'

type Row = { id: string; language_entity_id: string | null; language_name?: string | null; estimated_budget_cents: number | null; status: string | null }

export const StepLanguages: React.FC<{ flow: any }> = ({ flow }) => {
  const [rows, setRows] = React.useState<Row[]>([])
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    listAvailableLanguages({ status: 'available', limit: 100 }).then(setRows).catch(console.error)
  }, [])

  const columns: Column<Row & { selected?: boolean }>[] = [
    { key: 'selected', header: '', render: (_v, r) => (
      <input type="checkbox" checked={!!selected[r.id]} onChange={(e)=> setSelected(s=> ({...s, [r.id]: e.target.checked}))} />
    ), width: '8' },
    { key: 'language_name', header: 'Language', render: (_v, r) => r.language_name ?? r.language_entity_id ?? '—', sortable: true },
    { key: 'estimated_budget_cents', header: 'Est. budget', render: (v) => v ? `$${(v/100).toLocaleString()}` : '—', sortable: true },
  ]

  const selectedRows = rows.filter(r => selected[r.id])
  const totals = selectedRows.reduce((acc, r) => {
    if (!r.estimated_budget_cents) return acc
    const { upfront, monthly, months } = computeUpfrontMonthly(r.estimated_budget_cents)
    acc.upfront += upfront
    acc.monthly += monthly
    acc.months = months
    return acc
  }, { upfront: 0, monthly: 0, months: 12 })

  const continueNext = () => {
    flow.setAdopt({ languageIds: selectedRows.map(r=>r.id), upfront_cents: totals.upfront, monthly_cents: totals.monthly, months: totals.months })
    flow.next()
  }

  return (
    <div className="space-y-4">
      <DataTable data={rows.map(r=> ({...r, selected: !!selected[r.id]}))} columns={columns} />
      <div className="flex items-center justify-between border rounded-lg p-3">
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          Upfront today: <span className="font-semibold">${(totals.upfront/100).toLocaleString()}</span> ·
          Monthly: <span className="font-semibold">${(totals.monthly/100).toLocaleString()}</span> × {totals.months}
        </div>
        <Button onClick={continueNext} disabled={selectedRows.length===0}>Continue</Button>
      </div>
    </div>
  )
}

export default StepLanguages



