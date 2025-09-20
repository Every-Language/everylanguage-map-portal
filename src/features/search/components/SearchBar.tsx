import React from 'react'
import { useLocation } from 'react-router-dom'
import type { SearchResult } from '../types'
import { useSearch } from '../hooks/useSearch'

interface SearchBarProps {
  onSelect: (item: SearchResult) => void
  className?: string
  embedded?: boolean
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelect, className, embedded }) => {
  const [query, setQuery] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const { results, isLoading } = useSearch(query)
  const location = useLocation()

  React.useEffect(() => {
    setIsOpen(query.trim().length >= 2)
  }, [query])

  // Clear search input on any navigation
  React.useEffect(() => {
    setQuery('')
    setIsOpen(false)
  }, [location.pathname, location.search])

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // no-op: filter removed

  return (
    <div
      ref={rootRef}
      className={`${embedded ? 'w-full' : 'absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl'} ${className ?? ''}`}
    >
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.trim().length >= 2) setIsOpen(true) }}
            placeholder="Search languages or regions"
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 px-4 py-2 shadow focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600"
          />
          {isOpen && (results.length > 0 || isLoading) && (
            <div className="absolute mt-1 left-0 right-0 max-h-[50vh] overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
              {isLoading && <div className="px-4 py-3 text-sm text-neutral-500">Searching…</div>}
              {!isLoading && results.map((r, idx) => (
                <button
                  key={`${r.kind}-${r.id}-${idx}`}
                  onClick={() => { setQuery(''); setIsOpen(false); onSelect(r) }}
                  className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">{r.name}</div>
                      <div className="text-xs text-neutral-500">
                        {r.kind === 'language' ? 'Language' : 'Region'}{r.level ? ` · ${r.level}` : ''}{r.alias ? ` · matched: ${r.alias}` : ''}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase rounded px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700 text-neutral-500">{r.kind}</span>
                  </div>
                </button>
              ))}
              {!isLoading && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-neutral-500">No matches</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchBar


