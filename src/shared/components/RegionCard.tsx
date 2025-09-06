import React from 'react'
import { Card, CardContent } from './ui/Card'

export type RegionSummary = {
  id: string
  name: string
  level?: string
  languagesCount?: number
}

export const RegionCard: React.FC<{
  region: RegionSummary
  isSelected?: boolean
  onClick?: (id: string) => void
}> = ({ region, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick?.(region.id)}
      className="w-full text-left"
    >
      <Card padding="sm" variant="ghost" className={`border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 ${isSelected ? 'ring-2 ring-accent-600 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900' : ''}`}>
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`text-sm font-medium ${isSelected ? 'text-accent-600' : 'text-neutral-900 dark:text-neutral-100'}`}>{region.name}</div>
              {region.level && (
                <div className={`text-xs mt-0.5 uppercase tracking-wide ${isSelected ? 'text-accent-600' : 'text-neutral-500'}`}>{region.level}</div>
              )}
            </div>
            {typeof region.languagesCount === 'number' && (
              <div className="text-xs text-neutral-500">{region.languagesCount} languages</div>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  )
}


