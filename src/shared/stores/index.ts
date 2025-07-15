// Store exports
export * from './types'

// Authentication store
export {
  useAuthStore,
  initializeAuth,
  useUser,
  useDbUser,
  useSession,
  useAuthLoading,
  useAuthError,
  useIsAuthenticated,
  useAuthActions,
} from './auth'

// Project management store
export {
  useProjectStore,
  initializeProjectStore,
  useProjects,
  useCurrentProject,
  useLanguageEntities,
  useRegions,
  useBibleVersions,
  useProjectLoading,
  useProjectError,
  useProjectActions,
  useProjectById,
  useLanguageEntityById,
  useRegionById,
  useBibleVersionById,
} from './project'

// Upload store
export {
  useUploadStore,
  useUploadBatches,
  useCurrentBatch,
  useIsUploading,
  useGlobalProgress,
  useUploadError,
  useUploadActions,
  useBatchById,
  useFileById,
  useActiveBatches,
  useCompletedBatches,
  useFailedBatches,
} from './upload'

// UI store
export {
  useUIStore,
  initializeTheme,
  useNotifications,
  useModal,
  useSidebar,
  useTheme,
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
    console.log('Initializing Zustand stores...')
    
    // Import initialization functions
    const { initializeTheme } = await import('./ui')
    const { initializeAuth } = await import('./auth')
    const { initializeProjectStore } = await import('./project')
    
    // Initialize theme system first
    initializeTheme()
    
    // Initialize authentication
    initializeAuth()
    
    // Initialize project store (load reference data)
    await initializeProjectStore()
    
    console.log('Zustand stores initialized successfully')
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