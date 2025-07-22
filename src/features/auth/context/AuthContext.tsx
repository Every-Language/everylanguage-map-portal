import React, { createContext, useEffect, useState, useCallback, useRef } from 'react'
import { authService } from '../services/auth'
import type { AuthContextType, AuthState, User, Session, DbUser } from '../types'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    dbUser: null,
    session: null,
    loading: true,
  })

  // Track pending sign in operations
  const pendingSignInRef = useRef<{
    resolve: () => void
    reject: (error: Error) => void
  } | null>(null)

  const refreshUser = useCallback(async () => {
    try {
      const [user, session] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentSession(),
      ])

      let dbUser: DbUser | null = null
      if (user) {
        dbUser = await authService.getDbUser(user.id)
      }

      setState({
        user,
        dbUser,
        session,
        loading: false,
      })
    } catch (error) {
      console.error('Error refreshing user:', error)
      setState({
        user: null,
        dbUser: null,
        session: null,
        loading: false,
      })
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Create a promise that will be resolved when auth state changes
      const authStatePromise = new Promise<void>((resolve, reject) => {
        pendingSignInRef.current = { resolve, reject }
      })

      // Attempt to sign in
      await authService.signIn(email, password)

      // Wait for auth state to be updated before resolving
      await authStatePromise
    } catch (error) {
      // Clean up pending promise if sign in fails
      if (pendingSignInRef.current) {
        pendingSignInRef.current = null
      }
      console.error('Sign in error:', error)
      throw error
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, userData?: Partial<DbUser>) => {
    try {
      await authService.signUp(email, password, userData)
      // Auth state change will trigger refresh
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
      setState({
        user: null,
        dbUser: null,
        session: null,
        loading: false,
      })
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authService.resetPassword(email)
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    try {
      await authService.updatePassword(password)
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  }, [])

  useEffect(() => {
    // Initial auth state check
    refreshUser()

    // Set up auth state change listener
    const { data: { subscription } } = authService.onAuthStateChange(
      async (user: User | null, session: Session | null) => {
        let dbUser: DbUser | null = null
        if (user) {
          try {
            dbUser = await authService.getDbUser(user.id)
          } catch (error) {
            console.error('Error fetching db user:', error)
          }
        }

        setState({
          user,
          dbUser,
          session,
          loading: false,
        })

        // Resolve pending sign in promise if user is now authenticated
        if (pendingSignInRef.current && user) {
          pendingSignInRef.current.resolve()
          pendingSignInRef.current = null
        }
        // Reject pending sign in promise if sign in failed (no user after auth state change)
        else if (pendingSignInRef.current && !user && !session) {
          pendingSignInRef.current.reject(new Error('Authentication failed'))
          pendingSignInRef.current = null
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [refreshUser])

  const value: AuthContextType = {
    user: state.user,
    dbUser: state.dbUser,
    session: state.session,
    loading: state.loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 