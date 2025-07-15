import { useFetchCollection, useFetchById } from './base-hooks'
import type { TableRow } from './base-hooks'

export type LanguageEntity = TableRow<'language_entities'>

// Hook to fetch all language entities
export function useLanguageEntities() {
  return useFetchCollection('language_entities', {
    orderBy: { column: 'name', ascending: true }
  })
}

// Hook to fetch a single language entity by ID
export function useLanguageEntity(id: string | null) {
  return useFetchById('language_entities', id)
}

// Hook to fetch root language entities (no parent)
export function useRootLanguageEntities() {
  return useFetchCollection('language_entities', {
    filters: { parent_id: null },
    orderBy: { column: 'name', ascending: true }
  })
}

// Hook to fetch child language entities by parent ID
export function useChildLanguageEntities(parentId: string | null) {
  return useFetchCollection('language_entities', {
    filters: { parent_id: parentId },
    orderBy: { column: 'name', ascending: true },
    enabled: !!parentId,
  })
}

// Hook to search language entities by name
export function useLanguageEntitiesByName(searchTerm: string | null) {
  return useFetchCollection('language_entities', {
    // Note: This would need to be implemented with ilike filter in a more complex version
    filters: searchTerm ? { name: searchTerm } : undefined,
    orderBy: { column: 'name', ascending: true },
    enabled: !!searchTerm,
  })
} 