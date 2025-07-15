import * as React from 'react'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastProvider,
  ToastViewport,
} from '../components/Toast'

// Hook for using toasts
interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'destructive'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void
  dismiss: (toastId?: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastManager')
  }
  return context
}

// Toast Manager Component
interface ToastManagerProps {
  children: React.ReactNode
}

interface ToastItem extends ToastOptions {
  id: string
  open: boolean
}

export const ToastManager: React.FC<ToastManagerProps> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const toast = React.useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItem = {
      id,
      open: true,
      duration: 5000,
      ...options,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto dismiss
    if (newToast.duration !== Infinity) {
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((toast) =>
            toast.id === id ? { ...toast, open: false } : toast
          )
        )
      }, newToast.duration)
    }
  }, [])

  const dismiss = React.useCallback((toastId?: string) => {
    setToasts((prev) =>
      toastId
        ? prev.map((toast) =>
            toast.id === toastId ? { ...toast, open: false } : toast
          )
        : prev.map((toast) => ({ ...toast, open: false }))
    )
  }, [])

  const removeToast = React.useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId))
  }, [])

  const contextValue = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={contextValue}>
      <ToastProvider>
        {children}
        <ToastViewport />
        {toasts.map((toastItem) => {
          const actionVariant = toastItem.variant === 'destructive' ? 'error' : (toastItem.variant || 'default')
          return (
            <Toast
              key={toastItem.id}
              variant={toastItem.variant}
              open={toastItem.open}
              onOpenChange={(open) => {
                if (!open) {
                  removeToast(toastItem.id)
                }
              }}
              duration={toastItem.duration}
            >
              <ToastContent
                variant={toastItem.variant}
                title={toastItem.title}
                description={toastItem.description}
              />
              {toastItem.action && (
                <ToastAction
                  variant={actionVariant as 'default' | 'success' | 'error' | 'warning' | 'info'}
                  altText={toastItem.action.label}
                  onClick={toastItem.action.onClick}
                >
                  {toastItem.action.label}
                </ToastAction>
              )}
              <ToastClose />
            </Toast>
          )
        })}
      </ToastProvider>
    </ToastContext.Provider>
  )
}

export type { ToastOptions } 