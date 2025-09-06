import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { 
  UIStore, 
  UIState, 
  NotificationItem 
} from './types'

// Initial state
const initialState: UIState = {
  notifications: [],
  modal: {
    isOpen: false,
    component: null,
    props: undefined,
    options: undefined,
  },
  sidebar: {
    isOpen: true,
    isCollapsed: false,
  },
  theme: 'light',
  loading: {
    global: false,
    actions: {},
  },
  preferences: {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    audioPlayer: {
      volume: 0.8,
      playbackRate: 1.0,
    },
  },
}

// Create the UI store
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Notification actions
        addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
          const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const newNotification: NotificationItem = {
            ...notification,
            id,
            timestamp: new Date(),
          }

          const currentNotifications = get().notifications
          set({ 
            notifications: [...currentNotifications, newNotification] 
          })

          // Auto-remove notification after duration (if specified)
          if (notification.duration && notification.duration > 0) {
            setTimeout(() => {
              get().removeNotification(id)
            }, notification.duration)
          }
        },

        removeNotification: (id: string) => {
          const currentNotifications = get().notifications
          set({ 
            notifications: currentNotifications.filter((n) => n.id !== id) 
          })
        },

        clearNotifications: () => {
          set({ notifications: [] })
        },

        // Modal actions
        openModal: (component: React.ComponentType<unknown>, props: Record<string, unknown> = {}, options: UIState['modal']['options'] = {}) => {
          set({
            modal: {
              isOpen: true,
              component,
              props,
              options: {
                size: 'md',
                closable: true,
                closeOnOverlayClick: true,
                ...options,
              },
            },
          })
        },

        closeModal: () => {
          set({
            modal: {
              isOpen: false,
              component: null,
              props: undefined,
              options: undefined,
            },
          })
        },

        // Sidebar actions
        toggleSidebar: () => {
          const currentState = get().sidebar
          set({
            sidebar: {
              ...currentState,
              isOpen: !currentState.isOpen,
            },
          })
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          const currentState = get().sidebar
          set({
            sidebar: {
              ...currentState,
              isCollapsed: collapsed,
            },
          })
        },

        // Theme actions
        setTheme: (theme: UIState['theme']) => {
          set({ theme })
          
          // Apply theme to document root
          if (typeof window !== 'undefined') {
            const root = window.document.documentElement
            root.classList.remove('light', 'dark')
            
            if (theme === 'auto') {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
              root.classList.add(prefersDark ? 'dark' : 'light')
            } else {
              root.classList.add(theme)
            }
          }
        },

        // Loading actions
        setGlobalLoading: (loading: boolean) => {
          const currentState = get().loading
          set({
            loading: {
              ...currentState,
              global: loading,
            },
          })
        },

        setActionLoading: (action: string, loading: boolean) => {
          const currentState = get().loading
          const updatedActions = { ...currentState.actions }
          
          if (loading) {
            updatedActions[action] = true
          } else {
            delete updatedActions[action]
          }

          set({
            loading: {
              ...currentState,
              actions: updatedActions,
            },
          })
        },

        // Preferences actions
        updatePreferences: (updates: Partial<UIState['preferences']>) => {
          const currentPreferences = get().preferences
          set({
            preferences: {
              ...currentPreferences,
              ...updates,
            },
          })
        },
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          // Persist user preferences and some UI state
          sidebar: state.sidebar,
          theme: state.theme,
          preferences: state.preferences,
          // Don't persist notifications, modal, or loading states
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
)

// Selectors for common use cases
export const useNotifications = () => useUIStore((state) => state.notifications)
export const useModal = () => useUIStore((state) => state.modal)
export const useSidebar = () => useUIStore((state) => state.sidebar)
export const useTheme = () => useUIStore((state) => state.theme)
export const useGlobalLoading = () => useUIStore((state) => state.loading.global)
export const useActionLoading = (action: string) => 
  useUIStore((state) => state.loading.actions[action] || false)
export const usePreferences = () => useUIStore((state) => state.preferences)

// Action selectors
export const useUIActions = () => useUIStore((state) => ({
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
  openModal: state.openModal,
  closeModal: state.closeModal,
  toggleSidebar: state.toggleSidebar,
  setSidebarCollapsed: state.setSidebarCollapsed,
  setTheme: state.setTheme,
  setGlobalLoading: state.setGlobalLoading,
  setActionLoading: state.setActionLoading,
  updatePreferences: state.updatePreferences,
}))

// Notification action selectors
export const useNotificationActions = () => useUIStore((state) => ({
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}))

// Modal action selectors
export const useModalActions = () => useUIStore((state) => ({
  openModal: state.openModal,
  closeModal: state.closeModal,
}))

// Theme system initialization
export const initializeTheme = () => {
  const theme = useUIStore.getState().theme
  const { setTheme } = useUIStore.getState()
  
  // Apply initial theme
  setTheme(theme)
  
  // Listen for system theme changes when in auto mode
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      const currentTheme = useUIStore.getState().theme
      if (currentTheme === 'auto') {
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(mediaQuery.matches ? 'dark' : 'light')
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    // Clean up listener on app unmount
    window.addEventListener('beforeunload', () => {
      mediaQuery.removeEventListener('change', handleChange)
    })
  }
}

// Helper functions for common notification patterns
export const showSuccessNotification = (title: string, message: string, duration = 5000) => {
  useUIStore.getState().addNotification({
    type: 'success',
    title,
    message,
    duration,
  })
}

export const showErrorNotification = (title: string, message: string, duration = 8000) => {
  useUIStore.getState().addNotification({
    type: 'error',
    title,
    message,
    duration,
  })
}

export const showWarningNotification = (title: string, message: string, duration = 6000) => {
  useUIStore.getState().addNotification({
    type: 'warning',
    title,
    message,
    duration,
  })
}

export const showInfoNotification = (title: string, message: string, duration = 5000) => {
  useUIStore.getState().addNotification({
    type: 'info',
    title,
    message,
    duration,
  })
} 