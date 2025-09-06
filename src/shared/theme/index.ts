// Store exports
export * from './ui'
export { ThemeProvider, useTheme } from './theme'

// UI store
export {
  useUIStore,
  initializeTheme,
  useNotifications,
  useModal,
  useSidebar,
  useGlobalLoading,
  useActionLoading,
  usePreferences,
  useUIActions,
  useNotificationActions,
  useModalActions,
  showSuccessNotification,
  showErrorNotification,
  showWarningNotification,
  showInfoNotification,
} from './ui'

// Store initialization
export const initializeStores = async () => {
  try {
    
    // Import initialization functions
    const { initializeTheme } = await import('./ui')
    
    // Initialize theme system first
    initializeTheme()
  
    
  } catch (error) {
    console.error('Error initializing stores:', error)
    throw error
  }
}

// Helper function to reset all stores (useful for testing or logout)
export const resetAllStores = () => {
  // Clear persisted data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth-store')
    localStorage.removeItem('project-store')
    localStorage.removeItem('ui-store')
  }
  
  // Reload the page to reinitialize stores
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
} 