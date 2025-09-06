import React from 'react'
import { unifiedSearch } from '../api/searchApi'
import type { SearchResult } from '../types'

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export function useSearch(query: string): { results: SearchResult[]; isLoading: boolean } {
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const debounced = useDebounce(query, 250)

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      const q = debounced.trim()
      if (q.length < 2) {
        setResults([])
        return
      }
      setIsLoading(true)
      try {
        const items = await unifiedSearch(q)
        if (!cancelled) setResults(items)
      } catch (e) {
        if (!cancelled) setResults([])
        console.error('Search error', e)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [debounced])

  return { results, isLoading }
}


