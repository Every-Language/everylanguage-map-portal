import { useQueryClient } from '@tanstack/react-query'
import type { TableName, TableRow } from './base-hooks'
import type { TableInsert, TableUpdate } from './base-mutations'
import { useUIStore } from '../../stores/ui'

// Generate a temporary ID for optimistic updates
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Type for optimistic data with temporary ID
export type OptimisticData<T extends Record<string, unknown>> = T & {
  id: string
  __optimistic?: true
  __tempId?: string
}

// Optimistic update context for rollback
export interface OptimisticContext<T> {
  previousData: T
  optimisticData: T
  queryKey: readonly unknown[]
}

// Hook for optimistic updates
export function useOptimisticUpdates() {
  const queryClient = useQueryClient()

  // Create optimistic record
  const createOptimistic = <T extends TableName>(
    table: T,
    data: TableInsert<T>,
    options?: {
      generateId?: () => string
      queryKey?: readonly unknown[]
    }
  ): OptimisticData<TableRow<T>> => {
    const tempId = options?.generateId?.() || generateTempId()
    
    return {
      ...data,
      id: tempId,
      __optimistic: true,
      __tempId: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as OptimisticData<TableRow<T>>
  }

  // Update optimistic record
  const updateOptimistic = <T extends TableName>(
    _table: T,
    id: string,
    updates: TableUpdate<T>,
    currentData: TableRow<T>
  ): OptimisticData<TableRow<T>> => {
    return {
      ...currentData,
      ...updates,
      id, // Ensure id is preserved
      updated_at: new Date().toISOString(),
    } as OptimisticData<TableRow<T>>
  }

  // Add optimistic record to collection
  const addToCollection = <T>(
    queryKey: readonly unknown[],
    optimisticData: T
  ): OptimisticContext<T[]> => {
    const previousData = queryClient.getQueryData<T[]>(queryKey) || []
    const optimisticCollection = [optimisticData, ...previousData]
    
    queryClient.setQueryData(queryKey, optimisticCollection)
    
    return {
      previousData,
      optimisticData: optimisticCollection,
      queryKey
    }
  }

  // Update record in collection
  const updateInCollection = <T extends { id: string }>(
    queryKey: readonly unknown[],
    id: string,
    updatedData: Partial<T>
  ): OptimisticContext<T[]> => {
    const previousData = queryClient.getQueryData<T[]>(queryKey) || []
    const optimisticCollection = previousData.map(item =>
      item.id === id ? { ...item, ...updatedData } : item
    )
    
    queryClient.setQueryData(queryKey, optimisticCollection)
    
    return {
      previousData,
      optimisticData: optimisticCollection,
      queryKey
    }
  }

  // Remove record from collection
  const removeFromCollection = <T extends { id: string }>(
    queryKey: readonly unknown[],
    id: string
  ): OptimisticContext<T[]> => {
    const previousData = queryClient.getQueryData<T[]>(queryKey) || []
    const optimisticCollection = previousData.filter(item => item.id !== id)
    
    queryClient.setQueryData(queryKey, optimisticCollection)
    
    return {
      previousData,
      optimisticData: optimisticCollection,
      queryKey
    }
  }

  // Rollback optimistic update
  const rollback = <T>(context: OptimisticContext<T>) => {
    queryClient.setQueryData(context.queryKey, context.previousData)
  }

  // Replace temporary data with real data
  const replaceOptimisticData = <T extends { id: string }>(
    queryKey: readonly unknown[],
    tempId: string,
    realData: T
  ) => {
    const currentData = queryClient.getQueryData<T[]>(queryKey) || []
    const updatedData = currentData.map(item =>
      item.id === tempId ? realData : item
    )
    
    queryClient.setQueryData(queryKey, updatedData)
  }

  return {
    createOptimistic,
    updateOptimistic,
    addToCollection,
    updateInCollection,
    removeFromCollection,
    rollback,
    replaceOptimisticData
  }
}

// Hook for optimistic mutation state
export function useOptimisticMutationState() {
  const { addNotification } = useUIStore()

  const showOptimisticFeedback = (action: 'create' | 'update' | 'delete', entity: string) => {
    const messages = {
      create: `Creating ${entity}...`,
      update: `Updating ${entity}...`,
      delete: `Deleting ${entity}...`
    }

    addNotification({
      type: 'info',
      title: 'Processing',
      message: messages[action],
      duration: 2000
    })
  }

  const showSuccessFeedback = (action: 'create' | 'update' | 'delete', entity: string) => {
    const messages = {
      create: `${entity} created successfully`,
      update: `${entity} updated successfully`,
      delete: `${entity} deleted successfully`
    }

    addNotification({
      type: 'success',
      title: 'Success',
      message: messages[action],
      duration: 3000
    })
  }

  const showErrorFeedback = (action: 'create' | 'update' | 'delete', entity: string, error: string) => {
    const messages = {
      create: `Failed to create ${entity}`,
      update: `Failed to update ${entity}`,
      delete: `Failed to delete ${entity}`
    }

    addNotification({
      type: 'error',
      title: 'Error',
      message: `${messages[action]}: ${error}`,
      duration: 5000
    })
  }

  return {
    showOptimisticFeedback,
    showSuccessFeedback,
    showErrorFeedback
  }
} 