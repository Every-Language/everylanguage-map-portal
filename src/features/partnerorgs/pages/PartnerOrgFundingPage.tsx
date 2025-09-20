import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card'
import { AnimatedProgress } from '../components/AnimatedProgress'
import { CountUp } from '../components/CountUp'
import { StageProgressBar } from '../components/StageProgress'
import { SelectItem } from '@/shared/components/ui/Select'
import { TitleSelect } from '@/shared/components/ui/TitleSelect'
import { usePartnerOrgData } from '../data/usePartnerOrgData'

export const PartnerOrgFundingPage: React.FC = () => {
  const data = usePartnerOrgData()
  const [projectId, setProjectId] = React.useState<string>(data.projects[0]?.id ?? '')
  React.useEffect(() => {
    if (!data.projects.find(p => p.id === projectId)) setProjectId(data.projects[0]?.id ?? '')
  }, [data.projects, projectId])
  const project = React.useMemo(() => data.projects.find(p => p.id === projectId), [data.projects, projectId])

  const budget = data.budgetByProject[project?.id ?? ''] ?? []
  const totalBudget = budget.reduce((a, b) => a + b.amount, 0)
  const translationPct = Math.round(((project?.chaptersDone ?? 0) / Math.max(project?.chaptersTotal ?? 1, 1)) * 100)
  const stageValues = [
    { stage: 'Translation', percent: translationPct, status: translationPct >= 100 ? 'completed' : translationPct > 0 ? 'in-progress' : 'not-started' } as const,
    { stage: 'Distribution', percent: project?.stage === 'Distribution' ? 40 : 0, status: project?.stage === 'Distribution' ? 'in-progress' : translationPct >= 100 ? 'in-progress' : 'not-started' } as const,
    { stage: 'Multiplication', percent: project?.stage === 'Multiplication' ? 20 : 0, status: project?.stage === 'Multiplication' ? 'in-progress' : 'not-started' } as const,
  ]

  return (
    <div className="space-y-6">
      {/* Project selector as title */}
      <TitleSelect
        value={projectId}
        onValueChange={setProjectId}
        placeholder="Select project"
        className="inline-flex"
      >
        {data.projects.map(p => (
          <SelectItem key={p.id} value={p.id}>{`${p.language} • ${p.project} • ${p.version}`}</SelectItem>
        ))}
      </TitleSelect>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-neutral-200 dark:border-neutral-800">
          <CardHeader><CardTitle className="text-sm text-neutral-500">Stage</CardTitle></CardHeader>
          <CardContent>
            <StageProgressBar values={stageValues} />
          </CardContent>
        </Card>
        <Card className="border border-neutral-200 dark:border-neutral-800">
          <CardHeader><CardTitle className="text-sm text-neutral-500">Estimated Budget</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight"><CountUp value={project?.fundingFunded ?? 0} formatter={(n) => Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)} /></div>
            <div className="text-xs text-neutral-500 mt-1">of {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project?.fundingTotal ?? 0)}</div>
            <div className="mt-3"><AnimatedProgress value={(project?.fundingFunded ?? 0)} max={(project?.fundingTotal ?? 1)} color={'accent'} /></div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200 dark:border-neutral-800">
          <CardHeader><CardTitle className="text-sm text-neutral-500">Budget Used</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight"><CountUp value={totalBudget} formatter={(n) => Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)} /></div>
            <div className="text-xs text-neutral-500 mt-1">Total spent so far</div>
          </CardContent>
        </Card>
      </div>

      {/* Budget table */}
      <Card className="border border-neutral-200 dark:border-neutral-800">
        <CardHeader><CardTitle>Budget Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2 px-2 sm:px-0">Item</th>
                  <th className="py-2 px-2 sm:px-0">Budget Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {budget.map((b) => (
                  <tr key={b.item}>
                    <td className="py-3 pr-3 whitespace-nowrap">{b.item}</td>
                    <td className="py-3">{Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(b.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 pr-3 font-semibold">Total</td>
                  <td className="py-3 font-semibold">{Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalBudget)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PartnerOrgFundingPage


