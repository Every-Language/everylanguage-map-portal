import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import type { TableName, TableRow, Tables } from './base-hooks'
import { transformError, type SupabaseError } from './base-hooks'

// Type aliases for mutation operations
export type TableInsert<T extends TableName> = Tables[T]['Insert']
export type TableUpdate<T extends TableName> = Tables[T]['Update']

// Helper type for records with id property
type RecordWithId = { id: string; [key: string]: unknown }

// Base mutation hook for creating records
export function useCreateRecord<T extends TableName>(
  table: T,
  options?: {
    onSuccess?: (data: TableRow<T>) => void
    onError?: (error: SupabaseError) => void
    invalidateQueries?: readonly unknown[][]
  } & Omit<UseMutationOptions<TableRow<T>, SupabaseError, TableInsert<T>>, 'mutationFn'>
): UseMutationResult<TableRow<T>, SupabaseError, TableInsert<T>> {
  const queryClient = useQueryClient()
  const { onSuccess, onError, invalidateQueries, ...mutationOptions } = options || {}

  return useMutation({
    mutationFn: async (data: TableInsert<T>) => {
      // Use any to bypass TypeScript complexity with Supabase types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .from(table)
        .insert(data)
        .select()
        .single()

      if (error) {
        throw transformError(error)
      }

      return result as TableRow<T>
    },
    onSuccess: (data) => {
      // Invalidate related queries
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey })
        })
      } else {
        // Default: invalidate all queries for this table
        queryClient.invalidateQueries({ queryKey: [table] })
      }

      onSuccess?.(data)
    },
    onError: (error) => {
      console.error(`Error creating ${table}:`, error)
      onError?.(error)
    },
    ...mutationOptions,
  })
}

// Base mutation hook for updating records
export function useUpdateRecord<T extends TableName>(
  table: T,
  options?: {
    onSuccess?: (data: TableRow<T>) => void
    onError?: (error: SupabaseError) => void
    invalidateQueries?: readonly unknown[][]
  } & Omit<UseMutationOptions<TableRow<T>, SupabaseError, { id: string; updates: TableUpdate<T> }>, 'mutationFn'>
): UseMutationResult<TableRow<T>, SupabaseError, { id: string; updates: TableUpdate<T> }> {
  const queryClient = useQueryClient()
  const { onSuccess, onError, invalidateQueries, ...mutationOptions } = options || {}

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TableUpdate<T> }) => {
      // Use any to bypass TypeScript complexity with Supabase types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw transformError(error)
      }

      return result as TableRow<T>
    },
    onSuccess: (data) => {
      // Invalidate related queries
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey })
        })
      } else {
        // Default: invalidate all queries for this table
        queryClient.invalidateQueries({ queryKey: [table] })
        // Also invalidate the specific record query
        queryClient.invalidateQueries({ queryKey: [table, 'detail', (data as RecordWithId).id] })
      }

      onSuccess?.(data)
    },
    onError: (error) => {
      console.error(`Error updating ${table}:`, error)
      onError?.(error)
    },
    ...mutationOptions,
  })
}

// Base mutation hook for deleting records
export function useDeleteRecord<T extends TableName>(
  table: T,
  options?: {
    onSuccess?: (id: string) => void
    onError?: (error: SupabaseError) => void
    invalidateQueries?: readonly unknown[][]
  } & Omit<UseMutationOptions<void, SupabaseError, string>, 'mutationFn'>
): UseMutationResult<void, SupabaseError, string> {
  const queryClient = useQueryClient()
  const { onSuccess, onError, invalidateQueries, ...mutationOptions } = options || {}

  return useMutation({
    mutationFn: async (id: string) => {
      // Use any to bypass TypeScript complexity with Supabase types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq('id', id)

      if (error) {
        throw transformError(error)
      }
    },
    onSuccess: (_, id) => {
      // Invalidate related queries
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey })
        })
      } else {
        // Default: invalidate all queries for this table
        queryClient.invalidateQueries({ queryKey: [table] })
      }

      // Remove the specific record from the cache
      queryClient.removeQueries({ queryKey: [table, 'detail', id] })

      onSuccess?.(id)
    },
    onError: (error) => {
      console.error(`Error deleting ${table}:`, error)
      onError?.(error)
    },
    ...mutationOptions,
  })
}

// Base mutation hook for soft deleting records (setting deleted_at)
export function useSoftDeleteRecord<T extends TableName>(
  table: T,
  options?: {
    onSuccess?: (data: TableRow<T>) => void
    onError?: (error: SupabaseError) => void
    invalidateQueries?: readonly unknown[][]
  } & Omit<UseMutationOptions<TableRow<T>, SupabaseError, string>, 'mutationFn'>
): UseMutationResult<TableRow<T>, SupabaseError, string> {
  const queryClient = useQueryClient()
  const { onSuccess, onError, invalidateQueries, ...mutationOptions } = options || {}

  return useMutation({
    mutationFn: async (id: string) => {
      // Use any to bypass TypeScript complexity with Supabase types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any)
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw transformError(error)
      }

      return result as TableRow<T>
    },
    onSuccess: (data) => {
      // Invalidate related queries
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey })
        })
      } else {
        // Default: invalidate all queries for this table
        queryClient.invalidateQueries({ queryKey: [table] })
        // Also invalidate the specific record query
        queryClient.invalidateQueries({ queryKey: [table, 'detail', (data as RecordWithId).id] })
      }

      onSuccess?.(data)
    },
    onError: (error) => {
      console.error(`Error soft deleting ${table}:`, error)
      onError?.(error)
    },
    ...mutationOptions,
  })
} 