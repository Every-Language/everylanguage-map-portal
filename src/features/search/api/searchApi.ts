import { supabase } from '@/shared/services/supabase'
import type { LanguageSearchRow, RegionSearchRow, SearchResult } from '../types'

export async function searchLanguages(query: string, max = 10, minSim = 0.1): Promise<SearchResult[]> {
  if (query.trim().length < 2) return []
  const { data, error } = await supabase.rpc('search_language_aliases', {
    search_query: query,
    max_results: max,
    min_similarity: minSim,
    include_regions: false,
  })
  if (error) throw error
  const rows = (data ?? []) as LanguageSearchRow[]
  return rows.map(r => ({
    kind: 'language',
    id: r.entity_id,
    name: r.entity_name,
    level: r.entity_level,
    score: r.alias_similarity_score,
    alias: r.alias_name,
  }))
}

export async function searchRegions(query: string, max = 10, minSim = 0.1): Promise<SearchResult[]> {
  if (query.trim().length < 2) return []
  const { data, error } = await supabase.rpc('search_region_aliases', {
    search_query: query,
    max_results: max,
    min_similarity: minSim,
    include_languages: false,
  })
  if (error) throw error
  const rows = (data ?? []) as RegionSearchRow[]
  return rows.map(r => ({
    kind: 'region',
    id: r.region_id,
    name: r.region_name,
    level: r.region_level,
    score: r.alias_similarity_score,
    alias: r.alias_name,
  }))
}

export async function unifiedSearch(query: string, opts?: { includeLanguages?: boolean; includeRegions?: boolean }): Promise<SearchResult[]> {
  const includeLangs = opts?.includeLanguages ?? true
  const includeRegs = opts?.includeRegions ?? true
  const tasks: Promise<SearchResult[]>[] = []
  if (includeLangs) tasks.push(searchLanguages(query))
  if (includeRegs) tasks.push(searchRegions(query))
  const parts = await Promise.all(tasks)
  const all = parts.flat()
  all.sort((a, b) => b.score - a.score)
  return all
}


