import React from 'react'
import { Progress } from '@/shared/components/ui/Progress'

export type StageKey = 'Translation' | 'Distribution' | 'Multiplication'

export interface StageProgressValue {
  stage: StageKey
  percent: number // 0-100
  status: 'not-started' | 'in-progress' | 'completed'
}

export const StageProgressBar: React.FC<{ values: StageProgressValue[] }>
  = ({ values }) => {
    return (
      <div className="flex items-center gap-4">
        {values.map((v, idx) => (
          <div key={v.stage} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ${v.status === 'completed' ? 'bg-accent-600' : v.status === 'in-progress' ? 'bg-accent-600/70' : 'bg-neutral-400'}`}>
                {v.status === 'completed' ? '✓' : v.status === 'in-progress' ? '•' : ''}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">{v.stage}</div>
            </div>
            {idx < values.length - 1 && (
              <div className="h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            )}
          </div>
        ))}
      </div>
    )
  }

export const StageStatsRow: React.FC<{ translationPct: number; distributionCount: number; churchesCount: number }>
  = ({ translationPct, distributionCount, churchesCount }) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 text-center">
          <div className="text-xs text-neutral-500 mb-2">Translation</div>
          <Progress variant="circular" size="md" value={translationPct} color="accent" showValue />
          <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">Translation</div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 text-center">
          <div className="text-xs text-neutral-500 mb-1">Distribution</div>
          <div className="text-2xl font-bold">{distributionCount.toLocaleString()}</div>
          <div className="text-xs text-neutral-500">Bibles distributed</div>
          <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">Distribution</div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 text-center">
          <div className="text-xs text-neutral-500 mb-1">Multiplication</div>
          <div className="text-2xl font-bold">{churchesCount.toLocaleString()}</div>
          <div className="text-xs text-neutral-500">Churches planted</div>
          <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">Multiplication</div>
        </div>
      </div>
    )
  }


