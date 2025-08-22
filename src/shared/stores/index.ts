// Store exports
export * from './auth';
export * from './project';
export * from './ui';
export * from './audioPlayer';
export * from './types';

// Authentication store
export {
  useAuthStore,
  useUser,
  useSession,
  useAuthLoading,
  useAuthError,
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

// Upload store - fixed exports to match actual exports
export {
  useUploadStore,
  useUploadWarning,
} from './mediaFileUpload'

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
    
    // Import initialization functions
    const { initializeTheme } = await import('./ui')
    const { initializeProjectStore } = await import('./project')
    
    // Initialize theme system first
    initializeTheme()
    
    // NOTE: Auth initialization is now handled by AuthContext
    // No separate initialization needed
    
    // Initialize project store (load reference data)
    await initializeProjectStore()
    
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