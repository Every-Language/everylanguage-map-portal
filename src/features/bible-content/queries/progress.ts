import { supabase } from '@/shared/services/supabase'

export type VersionCoverage = {
  id: string
  name: string
  books_complete?: number
  books_total?: number
  chapters_complete?: number
  chapters_total?: number
  verses_complete?: number
  verses_total?: number
}

const safePct = (complete?: number, total?: number): number => {
  const c = typeof complete === 'number' ? complete : 0
  const t = typeof total === 'number' ? total : 0
  if (t <= 0) return 0
  return Math.max(0, Math.min(1, c / t))
}

export const maxCoveragePercent = (v: VersionCoverage): number => {
  return Math.max(
    safePct(v.books_complete, v.books_total),
    safePct(v.chapters_complete, v.chapters_total),
    safePct(v.verses_complete, v.verses_total),
  )
}

const getNumber = (row: Record<string, unknown>, key: string): number | undefined => {
  const v = row[key]
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function normalizeFromRow(row: Record<string, unknown>, idKey: 'audio_version_id' | 'text_version_id') {
  // Normalize different column names from MV vs logical views
  const booksComplete = getNumber(row, 'books_complete')
  const booksTotal = getNumber(row, 'total_books') ?? getNumber(row, 'books_total')
  const chaptersComplete =
    getNumber(row, 'chapters_complete') ??
    getNumber(row, 'complete_chapters') ??
    getNumber(row, 'chapters_with_audio') ??
    getNumber(row, 'chapters_with_text')
  const chaptersTotal = getNumber(row, 'total_chapters') ?? getNumber(row, 'chapters_total')
  const versesComplete = getNumber(row, 'verses_complete') ?? getNumber(row, 'covered_verses')
  const versesTotal = getNumber(row, 'verses_total') ?? getNumber(row, 'total_verses')
  return {
    [idKey]: String(row[idKey] ?? ''),
    books_complete: booksComplete,
    books_total: booksTotal,
    chapters_complete: chaptersComplete,
    chapters_total: chaptersTotal,
    verses_complete: versesComplete,
    verses_total: versesTotal,
  }
}

async function fetchAudioSummariesByIds(versionIds: string[]): Promise<Array<{ audio_version_id: string } & Omit<VersionCoverage, 'id' | 'name'>>> {
  if (versionIds.length === 0) return []
  // Prefer MV, fallback to view
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mv = await (supabase as any)
    .from('mv_audio_version_progress_summary')
    .select('audio_version_id,covered_verses,total_verses,chapters_with_audio,total_chapters,books_complete,total_books')
    .in('audio_version_id', versionIds)
  if (!mv.error && mv.data) return (mv.data as unknown as Array<Record<string, unknown>>).map(r => normalizeFromRow(r, 'audio_version_id')) as Array<{ audio_version_id: string } & Omit<VersionCoverage, 'id' | 'name'>>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = await (supabase as any)
    .from('audio_version_progress_summary')
    .select('audio_version_id,books_complete,books_total,chapters_complete,chapters_total,verses_complete,verses_total')
    .in('audio_version_id', versionIds)
  if (v.error) throw v.error
  return (v.data as unknown as Array<Record<string, unknown>>).map(r => normalizeFromRow(r, 'audio_version_id')) as Array<{ audio_version_id: string } & Omit<VersionCoverage, 'id' | 'name'>>
}

async function fetchTextSummariesByIds(versionIds: string[]): Promise<Array<{ text_version_id: string } & Omit<VersionCoverage, 'id' | 'name'>>> {
  if (versionIds.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mv = await (supabase as any)
    .from('mv_text_version_progress_summary')
    .select('text_version_id,covered_verses,total_verses,complete_chapters,total_chapters,books_complete,total_books')
    .in('text_version_id', versionIds)
  if (!mv.error && mv.data) return (mv.data as unknown as Array<Record<string, unknown>>).map(r => normalizeFromRow(r, 'text_version_id')) as Array<{ text_version_id: string } & Omit<VersionCoverage, 'id' | 'name'>>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = await (supabase as any)
    .from('text_version_progress_summary')
    .select('text_version_id,books_complete,books_total,chapters_complete,chapters_total,verses_complete,verses_total')
    .in('text_version_id', versionIds)
  if (v.error) throw v.error
  return (v.data as unknown as Array<Record<string, unknown>>).map(r => normalizeFromRow(r, 'text_version_id')) as Array<{ text_version_id: string } & Omit<VersionCoverage, 'id' | 'name'>>
}

export async function fetchAudioVersionCoverages(languageEntityId: string): Promise<VersionCoverage[]> {
  const { data: versions, error } = await supabase
    .from('audio_versions')
    .select('id,name')
    .eq('language_entity_id', languageEntityId)
    .order('name')
  if (error) throw error

  const versionIds = (versions ?? []).map((v) => v.id as string)
  const summaries = await fetchAudioSummariesByIds(versionIds)
  const byId = new Map<string, Omit<VersionCoverage, 'id' | 'name'>>(summaries.map(s => [s.audio_version_id, s]))
  return (versions ?? []).map((v) => {
    const s = byId.get(v.id)
    return {
      id: v.id,
      name: v.name,
      books_complete: s?.books_complete,
      books_total: s?.books_total,
      chapters_complete: s?.chapters_complete,
      chapters_total: s?.chapters_total,
      verses_complete: s?.verses_complete,
      verses_total: s?.verses_total,
    }
  })
}

export async function fetchTextVersionCoverages(languageEntityId: string): Promise<VersionCoverage[]> {
  const { data: versions, error } = await supabase
    .from('text_versions')
    .select('id,name')
    .eq('language_entity_id', languageEntityId)
    .order('name')
  if (error) throw error

  const versionIds = (versions ?? []).map((v) => v.id as string)
  const summaries = await fetchTextSummariesByIds(versionIds)
  const byId = new Map<string, Omit<VersionCoverage, 'id' | 'name'>>(summaries.map(s => [s.text_version_id, s]))
  return (versions ?? []).map((v) => {
    const s = byId.get(v.id)
    return {
      id: v.id,
      name: v.name,
      books_complete: s?.books_complete,
      books_total: s?.books_total,
      chapters_complete: s?.chapters_complete,
      chapters_total: s?.chapters_total,
      verses_complete: s?.verses_complete,
      verses_total: s?.verses_total,
    }
  })
}

export async function fetchAudioVersionCoveragesForLanguageIds(languageEntityIds: string[]): Promise<VersionCoverage[]> {
  if (languageEntityIds.length === 0) return []
  const { data: versions, error } = await supabase
    .from('audio_versions')
    .select('id,name')
    .in('language_entity_id', languageEntityIds)
    .order('name')
  if (error) throw error

  const versionIds = (versions ?? []).map((v) => v.id as string)
  const summaries = await fetchAudioSummariesByIds(versionIds)
  const byId = new Map<string, Omit<VersionCoverage, 'id' | 'name'>>(summaries.map(s => [s.audio_version_id, s]))
  return (versions ?? []).map((v) => {
    const s = byId.get(v.id)
    return {
      id: v.id,
      name: v.name,
      books_complete: s?.books_complete,
      books_total: s?.books_total,
      chapters_complete: s?.chapters_complete,
      chapters_total: s?.chapters_total,
      verses_complete: s?.verses_complete,
      verses_total: s?.verses_total,
    }
  })
}

export async function fetchTextVersionCoveragesForLanguageIds(languageEntityIds: string[]): Promise<VersionCoverage[]> {
  if (languageEntityIds.length === 0) return []
  const { data: versions, error } = await supabase
    .from('text_versions')
    .select('id,name')
    .in('language_entity_id', languageEntityIds)
    .order('name')
  if (error) throw error

  const versionIds = (versions ?? []).map((v) => v.id as string)
  const summaries = await fetchTextSummariesByIds(versionIds)
  const byId = new Map<string, Omit<VersionCoverage, 'id' | 'name'>>(summaries.map(s => [s.text_version_id, s]))
  return (versions ?? []).map((v) => {
    const s = byId.get(v.id)
    return {
      id: v.id,
      name: v.name,
      books_complete: s?.books_complete,
      books_total: s?.books_total,
      chapters_complete: s?.chapters_complete,
      chapters_total: s?.chapters_total,
      verses_complete: s?.verses_complete,
      verses_total: s?.verses_total,
    }
  })
}


