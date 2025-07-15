import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCreateRecord, useUpdateRecord, useDeleteRecord } from './base-mutations'
import { useOptimisticUpdates, useOptimisticMutationState } from './optimistic-updates'
import type { CreateProjectData, UpdateProjectData } from './project-mutations'
import type { Project } from './projects'

// Optimistic create project hook
export function useCreateProjectOptimistic() {
  const queryClient = useQueryClient()
  const { 
    createOptimistic, 
    addToCollection, 
    rollback, 
    replaceOptimisticData 
  } = useOptimisticUpdates()
  const { 
    showOptimisticFeedback, 
    showSuccessFeedback, 
    showErrorFeedback 
  } = useOptimisticMutationState()
  const createBase = useCreateRecord('projects')

  return useMutation({
    mutationFn: async (data: CreateProjectData) => {
      return createBase.mutateAsync(data)
    },
    onMutate: async (data: CreateProjectData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      // Create optimistic data
      const optimisticProject = createOptimistic('projects', data)
      
      // Add to collection optimistically
      const context = addToCollection(['projects'], optimisticProject)
      
      // Show optimistic feedback
      showOptimisticFeedback('create', 'project')

      return { context, optimisticProject }
    },
    onSuccess: (data, variables, context) => {
      if (context?.optimisticProject) {
        // Replace optimistic data with real data
        replaceOptimisticData(
          ['projects'], 
          context.optimisticProject.id, 
          data
        )
      }
      
      // Show success feedback
      showSuccessFeedback('create', 'project')
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.context) {
        rollback(context.context)
      }
      
      // Show error feedback
      showErrorFeedback('create', 'project', error.message)
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

// Optimistic update project hook
export function useUpdateProjectOptimistic() {
  const queryClient = useQueryClient()
  const { 
    updateOptimistic, 
    updateInCollection, 
    rollback 
  } = useOptimisticUpdates()
  const { 
    showOptimisticFeedback, 
    showSuccessFeedback, 
    showErrorFeedback 
  } = useOptimisticMutationState()
  const updateBase = useUpdateRecord('projects')

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateProjectData }) => {
      return updateBase.mutateAsync({ id, updates })
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      await queryClient.cancelQueries({ queryKey: ['projects', 'detail', id] })

      // Get current data
      const currentProject = queryClient.getQueryData<Project>(['projects', 'detail', id])
      
      if (currentProject) {
        // Create optimistic data
        const optimisticProject = updateOptimistic('projects', id, updates, currentProject)
        
        // Update in collection optimistically
        const collectionContext = updateInCollection(['projects'], id, optimisticProject)
        
        // Update single item cache
        queryClient.setQueryData(['projects', 'detail', id], optimisticProject)
        
        // Show optimistic feedback
        showOptimisticFeedback('update', 'project')

        return { collectionContext, currentProject, optimisticProject }
      }

      return {}
    },
    onSuccess: () => {
      // Show success feedback
      showSuccessFeedback('update', 'project')
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.collectionContext) {
        rollback(context.collectionContext)
      }
      
      if (context?.currentProject) {
        queryClient.setQueryData(
          ['projects', 'detail', variables.id], 
          context.currentProject
        )
      }
      
      // Show error feedback
      showErrorFeedback('update', 'project', error.message)
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'detail', variables.id] })
    }
  })
}

// Optimistic delete project hook
export function useDeleteProjectOptimistic() {
  const queryClient = useQueryClient()
  const { 
    removeFromCollection, 
    rollback 
  } = useOptimisticUpdates()
  const { 
    showOptimisticFeedback, 
    showSuccessFeedback, 
    showErrorFeedback 
  } = useOptimisticMutationState()
  const deleteBase = useDeleteRecord('projects')

  return useMutation({
    mutationFn: async (id: string) => {
      return deleteBase.mutateAsync(id)
    },
    onMutate: async (id: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      await queryClient.cancelQueries({ queryKey: ['projects', 'detail', id] })

      // Remove from collection optimistically
      const context = removeFromCollection(['projects'], id)
      
      // Remove from single item cache
      queryClient.removeQueries({ queryKey: ['projects', 'detail', id] })
      
      // Show optimistic feedback
      showOptimisticFeedback('delete', 'project')

      return { context }
    },
    onSuccess: () => {
      // Show success feedback
      showSuccessFeedback('delete', 'project')
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.context) {
        rollback(context.context)
      }
      
      // Show error feedback
      showErrorFeedback('delete', 'project', error.message)
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
} 