import React from 'react'
import { Select, SelectItem } from '@/shared/components/ui/Select'
import { useTheme } from '@/shared/theme'

interface LeftColumnProps {
  width?: number
  children?: React.ReactNode
}

export const LeftColumn: React.FC<LeftColumnProps> = ({ width = 420, children }) => {
  const { theme, setTheme } = useTheme()
  return (
    <div className="absolute left-4 top-4 bottom-4 hidden md:flex flex-col gap-3" style={{ width }}>
      <div className="rounded-xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur border border-neutral-200 dark:border-neutral-800 p-3 shadow-card dark:shadow-dark-card">
        <div className="text-xs font-semibold tracking-wide text-neutral-700 dark:text-neutral-200 mb-2">Appearance</div>
        <Select
          value={theme}
          onValueChange={(v: string) => setTheme(v as 'system' | 'light' | 'dark')}
          placeholder="Theme"
        >
          <SelectItem value="system">System (default)</SelectItem>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
        </Select>
      </div>
      {children}
    </div>
  )
}


