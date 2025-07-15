import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { authService } from '../../features/auth/services/auth'
import type { AuthStore, AuthState, DbUser } from './types'
import type { User, Session } from '@supabase/supabase-js'

// Initial state
const initialState: AuthState = {
  user: null,
  dbUser: null,
  session: null,
  loading: true,
  error: null,
}

// Create the auth store
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Actions
        signIn: async (email: string, password: string) => {
          try {
            set({ loading: true, error: null })
            
            await authService.signIn(email, password)
            
            // Auth state change will be handled by the listener
            // set({ loading: false })
          } catch (error) {
            console.error('Sign in error:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Sign in failed' 
            })
            throw error
          }
        },

        signUp: async (email: string, password: string, userData?: Partial<DbUser>) => {
          try {
            set({ loading: true, error: null })
            
            await authService.signUp(email, password, userData)
            
            // Auth state change will be handled by the listener
            // set({ loading: false })
          } catch (error) {
            console.error('Sign up error:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Sign up failed' 
            })
            throw error
          }
        },

        signOut: async () => {
          try {
            set({ loading: true, error: null })
            
            await authService.signOut()
            
            // Clear the store state
            set({
              user: null,
              dbUser: null,
              session: null,
              loading: false,
              error: null,
            })
          } catch (error) {
            console.error('Sign out error:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Sign out failed' 
            })
            throw error
          }
        },

        resetPassword: async (email: string) => {
          try {
            set({ loading: true, error: null })
            
            await authService.resetPassword(email)
            
            set({ loading: false })
          } catch (error) {
            console.error('Reset password error:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Password reset failed' 
            })
            throw error
          }
        },

        updatePassword: async (password: string) => {
          try {
            set({ loading: true, error: null })
            
            await authService.updatePassword(password)
            
            set({ loading: false })
          } catch (error) {
            console.error('Update password error:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Password update failed' 
            })
            throw error
          }
        },

        refreshUser: async () => {
          try {
            set({ loading: true, error: null })
            
            const [user, session] = await Promise.all([
              authService.getCurrentUser(),
              authService.getCurrentSession(),
            ])

            let dbUser: DbUser | null = null
            if (user) {
              dbUser = await authService.getDbUser(user.id)
            }

            set({
              user,
              dbUser,
              session,
              loading: false,
              error: null,
            })
          } catch (error) {
            console.error('Error refreshing user:', error)
            set({
              user: null,
              dbUser: null,
              session: null,
              loading: false,
              error: error instanceof Error ? error.message : 'Failed to refresh user',
            })
          }
        },

        clearError: () => {
          set({ error: null })
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          // Only persist non-sensitive data
          user: state.user,
          dbUser: state.dbUser,
          session: state.session,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
)

// Initialize auth state and set up listener
let authListenerInitialized = false

export const initializeAuth = () => {
  if (authListenerInitialized) return
  authListenerInitialized = true

  // Set up auth state change listener
  const { data: { subscription } } = authService.onAuthStateChange(
    async (user: User | null, session: Session | null) => {
      try {
        let dbUser: DbUser | null = null
        if (user) {
          dbUser = await authService.getDbUser(user.id)
        }

        useAuthStore.setState({
          user,
          dbUser,
          session,
          loading: false,
          error: null,
        })
      } catch (error) {
        console.error('Error in auth state change:', error)
        useAuthStore.setState({
          user,
          dbUser: null,
          session,
          loading: false,
          error: error instanceof Error ? error.message : 'Auth state change failed',
        })
      }
    }
  )

  // Initial auth state check
  useAuthStore.getState().refreshUser()

  // Clean up listener on app unmount
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      subscription?.unsubscribe()
    })
  }
}

// Selectors for common use cases
export const useUser = () => useAuthStore((state) => state.user)
export const useDbUser = () => useAuthStore((state) => state.dbUser)
export const useSession = () => useAuthStore((state) => state.session)
export const useAuthLoading = () => useAuthStore((state) => state.loading)
export const useAuthError = () => useAuthStore((state) => state.error)
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user)

// Action selectors
export const useAuthActions = () => useAuthStore((state) => ({
  signIn: state.signIn,
  signUp: state.signUp,
  signOut: state.signOut,
  resetPassword: state.resetPassword,
  updatePassword: state.updatePassword,
  refreshUser: state.refreshUser,
  clearError: state.clearError,
})) 