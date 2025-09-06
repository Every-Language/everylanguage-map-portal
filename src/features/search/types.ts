export type LanguageSearchRow = {
  similarity_threshold_used: number
  alias_id: string
  alias_name: string
  alias_similarity_score: number
  entity_id: string
  entity_name: string
  entity_level: string
  entity_parent_id: string | null
}

export type RegionSearchRow = {
  similarity_threshold_used: number
  alias_id: string
  alias_name: string
  alias_similarity_score: number
  region_id: string
  region_name: string
  region_level: string
  region_parent_id: string | null
}

export type SearchResult =
  | { kind: 'language'; id: string; name: string; level?: string | null; score: number; alias?: string }
  | { kind: 'region'; id: string; name: string; level?: string | null; score: number; alias?: string }


