import { useFetchCollection, useFetchById } from './base-hooks'
import type { TableRow } from './base-hooks'

export type BibleVersion = TableRow<'bible_versions'>

// Hook to fetch all bible versions
export function useBibleVersions() {
  return useFetchCollection('bible_versions', {
    orderBy: { column: 'name', ascending: true }
  })
}

// Hook to fetch a single bible version by ID
export function useBibleVersion(id: string | null) {
  return useFetchById('bible_versions', id)
}

// Hook to fetch bible versions by language
export function useBibleVersionsByLanguage(languageCode: string | null) {
  return useFetchCollection('bible_versions', {
    filters: { language_code: languageCode },
    orderBy: { column: 'name', ascending: true },
    enabled: !!languageCode,
  })
}

// Hook to search bible versions by name
export function useBibleVersionsByName(searchTerm: string | null) {
  return useFetchCollection('bible_versions', {
    // Note: This would need to be implemented with ilike filter in a more complex version
    filters: searchTerm ? { name: searchTerm } : undefined,
    orderBy: { column: 'name', ascending: true },
    enabled: !!searchTerm,
  })
} 