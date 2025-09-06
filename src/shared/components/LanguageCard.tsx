import React from 'react'
import { Card, CardContent } from './ui/Card'

export type LanguageSummary = {
  id: string
  name: string
  level?: string
  regionsCount?: number
}

export const LanguageCard: React.FC<{
  language: LanguageSummary
  isSelected?: boolean
  onClick?: (id: string) => void
}> = ({ language, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick?.(language.id)}
      className="w-full text-left"
    >
      <Card padding="sm" variant="ghost" className={`border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 ${isSelected ? 'ring-2 ring-accent-600 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900' : ''}`}>
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`text-sm font-medium ${isSelected ? 'text-accent-600' : 'text-neutral-900 dark:text-neutral-100'}`}>{language.name}</div>
              {language.level && (
                <div className={`text-xs mt-0.5 uppercase tracking-wide ${isSelected ? 'text-accent-600' : 'text-neutral-500'}`}>{language.level}</div>
              )}
            </div>
            {typeof language.regionsCount === 'number' && (
              <div className="text-xs text-neutral-500">{language.regionsCount} regions</div>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  )
}


