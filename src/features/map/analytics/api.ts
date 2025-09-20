import { supabase } from '@/shared/services/supabase'

export type UUID = string

export type HeatmapPoint = {
  lon: number
  lat: number
  count: number
  lastAt: string | null
}

export const fetchLanguageListensHeatmap = async (
  languageEntityId: UUID
): Promise<HeatmapPoint[]> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('vw_language_listens_heatmap')
    .select('grid, event_count, last_event_at')
    .eq('language_entity_id', languageEntityId)

  if (error) throw error
  if (!data) return []

  return (data as Array<{ grid?: { type?: string; coordinates?: [number, number] }; event_count?: number; last_event_at?: string }>)
    .filter((row) => row.grid && row.grid.type === 'Point' && Array.isArray(row.grid.coordinates))
    .map((row) => ({
      lon: (row.grid!.coordinates as [number, number])[0],
      lat: (row.grid!.coordinates as [number, number])[1],
      count: Number(row.event_count ?? 0),
      lastAt: row.last_event_at ?? null,
    }))
}

// Country-scoped: fetch ISO country codes for all descendant countries under a region
export const fetchCountryCodesForRegion = async (
  regionId: UUID
): Promise<Array<{ country_region_id: string; country_code: string }>> => {
  // Get hierarchy and pick descendant/self countries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hier, error: err1 } = await (supabase as any).rpc('get_region_hierarchy', {
    region_id: regionId,
    generations_up: 0,
    generations_down: 6,
  })
  if (err1) throw err1
  const rows = (hier ?? []) as Array<{
    hierarchy_region_id: string
    hierarchy_region_level: string
    relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling'
  }>
  // Include self + descendants; we will rely on region_properties to filter to countries
  const countryIds = rows
    .filter(r => (r.relationship_type === 'self' || r.relationship_type === 'descendant'))
    .map(r => r.hierarchy_region_id)
  if (countryIds.length === 0) return []

  const { data: props, error: err2 } = await supabase
    .from('region_properties')
    .select('region_id,value')
    .eq('key', 'iso3166-1-alpha2')
    .in('region_id', countryIds)
  if (err2) throw err2
  return (props ?? [])
    .filter((p): p is { region_id: string; value: string } => !!p && typeof (p as { value?: unknown }).value === 'string')
    .map(p => ({ country_region_id: (p as { region_id: string }).region_id, country_code: ((p as { value: string }).value || '').toUpperCase() }))
}

// Self-only ISO2 code for a region if it is a country (or has the property set)

// Region-scoped: rows for a given region_id from vw_country_language_listens_heatmap
export const fetchRegionLanguageListensHeatmap = async (
  regionId: UUID
): Promise<Array<{ language_entity_id: string; grid: { type: string; coordinates: [number, number] }; event_count: number; last_event_at: string | null }>> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('vw_country_language_listens_heatmap')
    .select('language_entity_id, grid, event_count, last_event_at')
    .eq('region_id', regionId)

  if (error) throw error
  const rows = (data ?? []) as Array<{ language_entity_id?: string; grid?: { type?: string; coordinates?: [number, number] }; event_count?: number; last_event_at?: string | null }>
  return rows
    .filter(r => !!r.language_entity_id && r.grid && r.grid.type === 'Point' && Array.isArray(r.grid.coordinates))
    .map(r => ({
      language_entity_id: r.language_entity_id as string,
      grid: { type: 'Point', coordinates: r.grid!.coordinates as [number, number] },
      event_count: Number(r.event_count ?? 0),
      last_event_at: r.last_event_at ?? null,
    }))
}

// -------- Analytics (Materialized Views) --------

export type DownloadsByCountry = { country_code: string | null; downloads: number; last_download_at: string | null }
export type ListeningTimeByCountry = { country_code: string | null; total_listened_seconds: number; last_listened_at: string | null }
export type PopularChaptersByCountry = { country_code: string | null; chapter_id: string; listen_count: number; recent_listen_at: string | null }

export type DownloadsByLanguage = { language_entity_id: string; downloads: number; last_download_at: string | null }
export type ListeningTimeByLanguage = { language_entity_id: string; total_listened_seconds: number; last_listened_at: string | null }
export type PopularChaptersByLanguage = { language_entity_id: string; chapter_id: string; listen_count: number; recent_listen_at: string | null }

function safeUpper2(code: unknown): string | null {
  const s = (typeof code === 'string' ? code : '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(s) ? s : null
}

export async function fetchDownloadsByCountryForLanguages(languageEntityIds: string[], rowLimit = 5000): Promise<DownloadsByCountry[]> {
  if (languageEntityIds.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mv_language_downloads_by_country')
    .select('language_entity_id,country_code,downloads,last_download_at')
    .in('language_entity_id', languageEntityIds)
    .order('downloads', { ascending: false })
    .limit(rowLimit)

  if (error) throw error
  const rows = (data ?? []) as Array<{ country_code?: string | null; downloads?: number | null; last_download_at?: string | null }>
  return rows.map(r => ({
    country_code: safeUpper2(r.country_code),
    downloads: Number(r.downloads ?? 0),
    last_download_at: r.last_download_at ?? null,
  }))
}

export async function fetchListeningByCountryForLanguages(languageEntityIds: string[], rowLimit = 5000): Promise<ListeningTimeByCountry[]> {
  if (languageEntityIds.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mv_language_listening_time_by_country')
    .select('language_entity_id,country_code,total_listened_seconds,last_listened_at')
    .in('language_entity_id', languageEntityIds)
    .order('total_listened_seconds', { ascending: false })
    .limit(rowLimit)

  if (error) throw error
  const rows = (data ?? []) as Array<{ country_code?: string | null; total_listened_seconds?: number | null; last_listened_at?: string | null }>
  return rows.map(r => ({
    country_code: safeUpper2(r.country_code),
    total_listened_seconds: Number(r.total_listened_seconds ?? 0),
    last_listened_at: r.last_listened_at ?? null,
  }))
}

export async function fetchPopularChaptersByCountryForLanguages(languageEntityIds: string[], rowLimit = 5000): Promise<PopularChaptersByCountry[]> {
  if (languageEntityIds.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mv_language_popular_chapters_by_country')
    .select('language_entity_id,country_code,chapter_id,listen_count,recent_listen_at')
    .in('language_entity_id', languageEntityIds)
    .order('listen_count', { ascending: false })
    .limit(rowLimit)

  if (error) throw error
  const rows = (data ?? []) as Array<{ country_code?: string | null; chapter_id?: string | null; listen_count?: number | null; recent_listen_at?: string | null }>
  return rows
    .filter(r => !!r.chapter_id)
    .map(r => ({
      country_code: safeUpper2(r.country_code),
      chapter_id: String(r.chapter_id),
      listen_count: Number(r.listen_count ?? 0),
      recent_listen_at: r.recent_listen_at ?? null,
    }))
}

export async function fetchDownloadsByLanguageForCountryCodes(countryCodes: string[], rowLimit = 10000): Promise<DownloadsByLanguage[]> {
  if (countryCodes.length === 0) return []
  const codes = countryCodes.map(safeUpper2).filter((c): c is string => !!c)
  if (codes.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mv_language_downloads_by_country')
    .select('language_entity_id,downloads,last_download_at,country_code')
    .in('country_code', codes)
    .order('downloads', { ascending: false })
    .limit(rowLimit)

  if (error) throw error
  const rows = (data ?? []) as Array<{ language_entity_id?: string | null; downloads?: number | null; last_download_at?: string | null }>
  return rows
    .filter(r => !!r.language_entity_id)
    .map(r => ({
      language_entity_id: String(r.language_entity_id),
      downloads: Number(r.downloads ?? 0),
      last_download_at: r.last_download_at ?? null,
    }))
}

export async function fetchListeningByLanguageForCountryCodes(countryCodes: string[], rowLimit = 10000): Promise<ListeningTimeByLanguage[]> {
  if (countryCodes.length === 0) return []
  const codes = countryCodes.map(safeUpper2).filter((c): c is string => !!c)
  if (codes.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mv_language_listening_time_by_country')
    .select('language_entity_id,total_listened_seconds,last_listened_at,country_code')
    .in('country_code', codes)
    .order('total_listened_seconds', { ascending: false })
    .limit(rowLimit)

  if (error) throw error
  const rows = (data ?? []) as Array<{ language_entity_id?: string | null; total_listened_seconds?: number | null; last_listened_at?: string | null }>
  return rows
    .filter(r => !!r.language_entity_id)
    .map(r => ({
      language_entity_id: String(r.language_entity_id),
      total_listened_seconds: Number(r.total_listened_seconds ?? 0),
      last_listened_at: r.last_listened_at ?? null,
    }))
}

export async function fetchPopularChaptersByLanguageForCountryCodes(countryCodes: string[], rowLimit = 10000): Promise<PopularChaptersByLanguage[]> {
  if (countryCodes.length === 0) return []
  const codes = countryCodes.map(safeUpper2).filter((c): c is string => !!c)
  if (codes.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mv_language_popular_chapters_by_country')
    .select('language_entity_id,chapter_id,listen_count,recent_listen_at,country_code')
    .in('country_code', codes)
    .order('listen_count', { ascending: false })
    .limit(rowLimit)

  if (error) throw error
  const rows = (data ?? []) as Array<{ language_entity_id?: string | null; chapter_id?: string | null; listen_count?: number | null; recent_listen_at?: string | null }>
  return rows
    .filter(r => !!r.language_entity_id && !!r.chapter_id)
    .map(r => ({
      language_entity_id: String(r.language_entity_id),
      chapter_id: String(r.chapter_id),
      listen_count: Number(r.listen_count ?? 0),
      recent_listen_at: r.recent_listen_at ?? null,
    }))
}

export async function fetchLanguageNames(languageIds: string[]): Promise<Record<string, string>> {
  if (languageIds.length === 0) return {}
  const { data, error } = await supabase
    .from('language_entities')
    .select('id,name')
    .in('id', languageIds)
  if (error) throw error
  const map: Record<string, string> = {}
  for (const r of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map[(r as any).id as string] = (r as any).name as string
  }
  return map
}

// -------- Unified MV aggregations (mv_language_listens_stats) --------

export type LanguageUsageByCountry = {
  country_code: string | null
  downloads_total: number
  listened_total_seconds: number
  top_chapters: string[]
}

export async function fetchLanguageUsageByCountryMV(languageEntityIds: string[]): Promise<LanguageUsageByCountry[]> {
  if (!Array.isArray(languageEntityIds) || languageEntityIds.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mv_language_listens_stats')
    .select('country_code, language_entity_id, chapter_id, downloads, total_listened_seconds, listen_count')
    .in('language_entity_id', languageEntityIds)

  if (error) throw error
  type Row = { country_code?: string | null; language_entity_id?: string | null; chapter_id?: string | null; downloads?: number | null; total_listened_seconds?: number | null; listen_count?: number | null }
  const rows = (data ?? []) as Row[]

  const byCountry = new Map<string | null, { downloads: number; seconds: number; chapterCounts: Map<string, number> }>()
  for (const r of rows) {
    const key = (r.country_code ?? null) as string | null
    if (!byCountry.has(key)) byCountry.set(key, { downloads: 0, seconds: 0, chapterCounts: new Map() })
    const agg = byCountry.get(key)!
    if (r.downloads != null) agg.downloads += Number(r.downloads)
    if (r.total_listened_seconds != null) agg.seconds += Number(r.total_listened_seconds)
    if (r.chapter_id) {
      const prev = agg.chapterCounts.get(r.chapter_id) ?? 0
      agg.chapterCounts.set(r.chapter_id, prev + Number(r.listen_count ?? 0))
    }
  }

  const result: LanguageUsageByCountry[] = []
  for (const [code, agg] of byCountry.entries()) {
    const top = Array.from(agg.chapterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([chapter]) => chapter)
    result.push({
      country_code: (typeof code === 'string' ? code.toUpperCase() : null),
      downloads_total: agg.downloads,
      listened_total_seconds: agg.seconds,
      top_chapters: top,
    })
  }
  result.sort((a, b) => (b.downloads_total ?? 0) - (a.downloads_total ?? 0))
  return result
}

export type LanguageUsageByRegion = {
  region_id: string | null
  downloads_total: number
  listened_total_seconds: number
  top_chapters: string[]
}

export async function fetchLanguageUsageByRegionMV(languageEntityIds: string[]): Promise<LanguageUsageByRegion[]> {
  if (!Array.isArray(languageEntityIds) || languageEntityIds.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mv_language_listens_stats')
    .select('region_id, language_entity_id, chapter_id, downloads, total_listened_seconds, listen_count')
    .in('language_entity_id', languageEntityIds)

  if (error) throw error
  type Row = { region_id?: string | null; language_entity_id?: string | null; chapter_id?: string | null; downloads?: number | null; total_listened_seconds?: number | null; listen_count?: number | null }
  const rows = (data ?? []) as Row[]

  const byRegion = new Map<string | null, { downloads: number; seconds: number; chapterCounts: Map<string, number> }>()
  for (const r of rows) {
    const key = (r.region_id ?? null) as string | null
    if (!byRegion.has(key)) byRegion.set(key, { downloads: 0, seconds: 0, chapterCounts: new Map() })
    const agg = byRegion.get(key)!
    if (r.downloads != null) agg.downloads += Number(r.downloads)
    if (r.total_listened_seconds != null) agg.seconds += Number(r.total_listened_seconds)
    if (r.chapter_id) {
      const prev = agg.chapterCounts.get(r.chapter_id) ?? 0
      agg.chapterCounts.set(r.chapter_id, prev + Number(r.listen_count ?? 0))
    }
  }

  const result: LanguageUsageByRegion[] = []
  for (const [rid, agg] of byRegion.entries()) {
    const top = Array.from(agg.chapterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([chapter]) => chapter)
    result.push({
      region_id: rid,
      downloads_total: agg.downloads,
      listened_total_seconds: agg.seconds,
      top_chapters: top,
    })
  }
  result.sort((a, b) => (b.downloads_total ?? 0) - (a.downloads_total ?? 0))
  return result
}

export type RegionUsageByLanguage = {
  language_entity_id: string
  downloads_total: number
  listened_total_seconds: number
  top_chapters: string[]
}

export async function fetchRegionUsageByLanguageMV(regionId: string): Promise<RegionUsageByLanguage[]> {
  // Collect descendant country region ids
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hier, error: err1 } = await (supabase as any).rpc('get_region_hierarchy', {
    region_id: regionId,
    generations_up: 0,
    generations_down: 6,
  })
  if (err1) throw err1
  const rows = (hier ?? []) as Array<{ hierarchy_region_id: string; hierarchy_region_level: string; relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling' }>
  const regionIds = rows
    .filter(r => (r.relationship_type === 'self' || r.relationship_type === 'descendant') && r.hierarchy_region_level === 'country')
    .map(r => r.hierarchy_region_id)
  if (regionIds.length === 0) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('mv_language_listens_stats')
    .select('region_id, language_entity_id, chapter_id, downloads, total_listened_seconds, listen_count')
    .in('region_id', regionIds)

  if (error) throw error
  type Row = { region_id?: string | null; language_entity_id?: string | null; chapter_id?: string | null; downloads?: number | null; total_listened_seconds?: number | null; listen_count?: number | null }
  const mv = (data ?? []) as Row[]

  const byLang = new Map<string, { downloads: number; seconds: number; chapterCounts: Map<string, number> }>()
  for (const r of mv) {
    const lang = r.language_entity_id
    if (!lang) continue
    if (!byLang.has(lang)) byLang.set(lang, { downloads: 0, seconds: 0, chapterCounts: new Map() })
    const agg = byLang.get(lang)!
    if (r.downloads != null) agg.downloads += Number(r.downloads)
    if (r.total_listened_seconds != null) agg.seconds += Number(r.total_listened_seconds)
    if (r.chapter_id) {
      const prev = agg.chapterCounts.get(r.chapter_id) ?? 0
      agg.chapterCounts.set(r.chapter_id, prev + Number(r.listen_count ?? 0))
    }
  }

  const result: RegionUsageByLanguage[] = []
  for (const [lang, agg] of byLang.entries()) {
    const top = Array.from(agg.chapterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([chapter]) => chapter)
    result.push({
      language_entity_id: lang,
      downloads_total: agg.downloads,
      listened_total_seconds: agg.seconds,
      top_chapters: top,
    })
  }
  result.sort((a, b) => (b.downloads_total ?? 0) - (a.downloads_total ?? 0))
  return result
}


