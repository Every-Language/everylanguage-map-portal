import React from 'react'
import { useParams } from 'react-router-dom'
// import { useQuery } from '@tanstack/react-query'
// import { supabase } from '@/shared/services/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card'
import { Progress } from '@/shared/components/ui/Progress'
import { AnimatedProgress } from '../components/AnimatedProgress'
import { CountUp } from '../components/CountUp'
import { StageProgressBar } from '../components/StageProgress'
import { usePartnerOrgData } from '../data/usePartnerOrgData'

// Using centralized mock data via usePartnerOrgData

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

export const PartnerOrgDashboardPage: React.FC = () => {
  useParams<{ id: string }>()
  // Partner fetch kept for future real data wiring

  const data = usePartnerOrgData()
  const totalProjects = data.projects.length
  const totalFunding = data.projects.reduce((acc, p) => acc + p.fundingTotal, 0)
  const totalFunded = data.projects.reduce((acc, p) => acc + p.fundingFunded, 0)

  const updates = data.updates

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl p-0 sm:p-0 lg:p-0 space-y-6">

        {/* Top stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border border-neutral-200 dark:border-neutral-800">
            <CardHeader>
              <CardTitle className="text-sm text-neutral-500">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight"><CountUp value={totalProjects} /></div>
            </CardContent>
          </Card>
          <Card className="border border-neutral-200 dark:border-neutral-800">
            <CardHeader>
              <CardTitle className="text-sm text-neutral-500">Total Funding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress variant="circular" size="lg" value={totalFunded} max={totalFunding} color="accent" showValue />
                <div>
                  <div className="text-3xl font-bold tracking-tight">{formatCurrency(totalFunded)}</div>
                  <div className="text-xs text-neutral-500 mt-1">of {formatCurrency(totalFunding)} total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects table */}
        <Card className="border border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500">
                    <th className="py-2 px-3 sm:px-4">Language</th>
                    <th className="py-2 px-3 sm:px-4">Stage</th>
                    <th className="py-2 px-3 sm:px-4">Progress</th>
                    <th className="py-2 px-3 sm:px-4">Funding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {data.projects.map((p) => {
                    const progressPct = Math.round((p.chaptersDone / p.chaptersTotal) * 100)
                    const stageValues = [
                      { stage: 'Translation', percent: progressPct, status: progressPct >= 100 ? 'completed' : progressPct > 0 ? 'in-progress' : 'not-started' } as const,
                      { stage: 'Distribution', percent: p.stage === 'Distribution' || progressPct >= 80 ? 50 : 0, status: p.stage === 'Distribution' ? 'in-progress' : progressPct >= 100 ? 'in-progress' : 'not-started' } as const,
                      { stage: 'Multiplication', percent: p.stage === 'Multiplication' ? 30 : 0, status: p.stage === 'Multiplication' ? 'in-progress' : 'not-started' } as const,
                    ]
                    return (
                      <tr key={p.id}>
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">{p.language}</td>
                        <td className="py-3 px-3 sm:px-4 min-w-[220px]">
                          <StageProgressBar values={stageValues} />
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="w-40 sm:w-56 md:w-64">
                            <AnimatedProgress value={p.chaptersDone} max={p.chaptersTotal} color="accent" />
                            <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 text-center">{p.chaptersDone}/{p.chaptersTotal}</div>
                          </div>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="w-40 sm:w-56 md:w-64">
                            <AnimatedProgress value={p.fundingFunded} max={p.fundingTotal} color="accent" />
                            <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 text-center">{formatCurrency(p.fundingFunded)} / {formatCurrency(p.fundingTotal)}</div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent updates feed */}
        <Card className="border border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {updates.slice(0, 6).map((u) => (
                <div
                  key={u.title + u.when}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-card"
                >
                  <div className="text-xs text-neutral-500 mb-1">{u.when} • {u.language} • {u.project}</div>
                  <div className="font-semibold mb-1">{u.title}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">{u.body}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PartnerOrgDashboardPage


