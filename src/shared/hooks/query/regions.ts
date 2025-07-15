import { useFetchCollection, useFetchById } from './base-hooks'
import type { TableRow } from './base-hooks'

export type Region = TableRow<'regions'>

// Hook to fetch all regions
export function useRegions() {
  return useFetchCollection('regions', {
    orderBy: { column: 'name', ascending: true }
  })
}

// Hook to fetch a single region by ID
export function useRegion(id: string | null) {
  return useFetchById('regions', id)
}

// Hook to fetch root regions (no parent)
export function useRootRegions() {
  return useFetchCollection('regions', {
    filters: { parent_id: null },
    orderBy: { column: 'name', ascending: true }
  })
}

// Hook to fetch child regions by parent ID
export function useChildRegions(parentId: string | null) {
  return useFetchCollection('regions', {
    filters: { parent_id: parentId },
    orderBy: { column: 'name', ascending: true },
    enabled: !!parentId,
  })
}

// Hook to fetch regions by country
export function useRegionsByCountry(country: string | null) {
  return useFetchCollection('regions', {
    filters: { country },
    orderBy: { column: 'name', ascending: true },
    enabled: !!country,
  })
}

// Hook to search regions by name
export function useRegionsByName(searchTerm: string | null) {
  return useFetchCollection('regions', {
    // Note: This would need to be implemented with ilike filter in a more complex version
    filters: searchTerm ? { name: searchTerm } : undefined,
    orderBy: { column: 'name', ascending: true },
    enabled: !!searchTerm,
  })
} 