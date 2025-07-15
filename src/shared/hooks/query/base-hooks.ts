import { useQuery } from '@tanstack/react-query'
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import type { Database } from '@everylanguage/shared-types'

// Type aliases for better readability
export type Tables = Database['public']['Tables']
export type TableName = keyof Tables
export type TableRow<T extends TableName> = Tables[T]['Row']

// Generic error type for Supabase
export interface SupabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

// Transform Supabase error to our error type
export const transformError = (error: unknown): SupabaseError => {
  const err = error as { message?: string; details?: string; hint?: string; code?: string }
  return {
    message: err?.message || 'An unknown error occurred',
    details: err?.details,
    hint: err?.hint,
    code: err?.code,
  }
}

// Base hook for fetching a collection of records
export function useFetchCollection<T extends TableName>(
  table: T,
  options?: {
    select?: string
    filters?: Record<string, unknown>
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
    offset?: number
  } & Omit<UseQueryOptions<TableRow<T>[], SupabaseError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TableRow<T>[], SupabaseError> {
  const { select, filters, orderBy, limit, offset, ...queryOptions } = options || {}

  return useQuery({
    queryKey: [table, { select, filters, orderBy, limit, offset }],
    queryFn: async () => {
      // Use any to bypass TypeScript complexity with Supabase types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any).from(table).select(select || '*')

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            if (value === null) {
              // For null values, use .is() method
              query = query.is(key, null)
            } else {
              query = query.eq(key, value)
            }
          }
        })
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
      }

      // Apply pagination
      if (limit) {
        query = query.limit(limit)
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw transformError(error)
      }

      return data as TableRow<T>[]
    },
    ...queryOptions,
  })
}

// Base hook for fetching a single record by ID
export function useFetchById<T extends TableName>(
  table: T,
  id: string | null,
  options?: {
    select?: string
  } & Omit<UseQueryOptions<TableRow<T> | null, SupabaseError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TableRow<T> | null, SupabaseError> {
  const { select, ...queryOptions } = options || {}

  return useQuery({
    queryKey: [table, 'detail', id],
    queryFn: async () => {
      if (!id) return null

      // Use any to bypass TypeScript complexity with Supabase types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from(table)
        .select(select || '*')
        .eq('id', id)
        .single()

      if (error) {
        // Handle "not found" errors gracefully
        if (error.code === 'PGRST116') {
          return null
        }
        throw transformError(error)
      }

      return data as TableRow<T>
    },
    enabled: !!id,
    ...queryOptions,
  })
} 