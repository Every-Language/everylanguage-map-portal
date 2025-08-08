import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { authService } from '../../features/auth/services/auth'
import type { AuthStore, AuthState, DbUser } from './types'


const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  error: null,
}

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
            
            // Auth state will be updated by the listener
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
            set({ 
              loading: false, 
              error: errorMessage,
              user: null,
              session: null,
            })
            throw error
          }
        },

        signUp: async (email: string, password: string, userData?: Partial<DbUser>) => {
          try {
            set({ loading: true, error: null })
            
            await authService.signUp(email, password, userData)
            
            // Auth state will be updated by the listener if signup is successful
            set({ loading: false })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign up failed'
            set({ 
              loading: false, 
              error: errorMessage,
              user: null,
              session: null,
            })
            throw error
          }
        },

        signOut: async () => {
          try {
            set({ loading: true, error: null })
            
            await authService.signOut()
            
            // Clear auth state
            set({
              user: null,
              session: null,
              loading: false,
              error: null,
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sign out failed'
            set({ loading: false, error: errorMessage })
            throw error
          }
        },

        resetPassword: async (email: string) => {
          try {
            set({ loading: true, error: null })
            
            await authService.resetPassword(email)
            
            set({ loading: false })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
            set({ loading: false, error: errorMessage })
            throw error
          }
        },

        updatePassword: async (password: string) => {
          try {
            set({ loading: true, error: null })
            
            await authService.updatePassword(password)
            
            set({ loading: false })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password update failed'
            set({ loading: false, error: errorMessage })
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

            // OPTIMIZATION: No longer fetch dbUser automatically for performance
            // Components should use useUserProfile hook for profile data instead
            set({
              user,
              session,
              loading: false,
              error: null,
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to refresh user'
            set({
              user: null,
              session: null,
              loading: false,
              error: errorMessage,
            })
            throw error
          }
        },

        clearError: () => {
          set({ error: null })
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          session: state.session,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
)

// Selector hooks for specific state pieces
export const useUser = () => useAuthStore((state) => state.user)
export const useSession = () => useAuthStore((state) => state.session)
export const useAuthLoading = () => useAuthStore((state) => state.loading)
export const useAuthError = () => useAuthStore((state) => state.error)

// REMOVED: useDbUser hook - use useUserProfile instead
// export const useDbUser = () => useAuthStore((state) => state.dbUser) 