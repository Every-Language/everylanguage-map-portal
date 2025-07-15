import { useCallback } from 'react'
import { processQueryError } from '../../../lib/query-error-handler'
import { useUIStore } from '../../stores/ui'

// Hook for handling query errors with UI integration
export function useQueryErrorHandler() {
  const { addNotification } = useUIStore()

  const handleError = useCallback((error: unknown, options?: {
    showNotification?: boolean
    customMessage?: string
    onRetry?: () => void
  }) => {
    const processedError = processQueryError(error)
    const { showNotification = true, customMessage, onRetry } = options || {}

    // Show notification if enabled
    if (showNotification) {
      addNotification({
        type: 'error',
        title: processedError.title,
        message: customMessage || processedError.message,
        duration: processedError.retryable ? 0 : 5000, // Persistent for retryable errors
        actions: processedError.retryable && onRetry ? [
          {
            label: 'Retry',
            onClick: onRetry
          }
        ] : undefined
      })
    }

    return processedError
  }, [addNotification])

  return { handleError }
}

// Hook for managing loading states with global integration  
export function useLoadingState(key?: string) {
  const { setActionLoading } = useUIStore()

  const setLoading = useCallback((loading: boolean) => {
    if (key) {
      setActionLoading(key, loading)
    }
  }, [key, setActionLoading])

  return { setLoading }
}

// Hook for handling query states (loading, error, success)
export function useQueryState() {
  const { handleError } = useQueryErrorHandler()
  const { setLoading } = useLoadingState()

  const handleQueryStart = useCallback((loadingKey?: string) => {
    if (loadingKey) {
      setLoading(true)
    }
  }, [setLoading])

  const handleQuerySuccess = useCallback((data: unknown, loadingKey?: string) => {
    if (loadingKey) {
      setLoading(false)
    }
    // Log success for debugging
    console.debug('Query success:', data)
  }, [setLoading])

  const handleQueryError = useCallback((error: unknown, options?: {
    loadingKey?: string
    showNotification?: boolean
    customMessage?: string
    onRetry?: () => void
  }) => {
    const { loadingKey, ...errorOptions } = options || {}
    
    if (loadingKey) {
      setLoading(false)
    }
    
    return handleError(error, errorOptions)
  }, [setLoading, handleError])

  return {
    handleQueryStart,
    handleQuerySuccess,
    handleQueryError
  }
} 