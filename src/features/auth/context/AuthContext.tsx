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

  // Helper function to get database user with retry logic
  const getDbUserWithRetry = useCallback(async (userId: string): Promise<DbUser | null> => {
    let retries = 0
    const maxRetries = 3
    const retryDelay = 1000

    while (retries < maxRetries) {
      const dbUser = await authService.getDbUser(userId)
      if (dbUser) {
        console.log('Database user found successfully')
        return dbUser
      }
      
      if (retries < maxRetries - 1) {
        console.log(`Database user not found, retrying in ${retryDelay}ms... (attempt ${retries + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      retries++
    }
    
    console.warn(`Database user not found after ${maxRetries} retries. This might be expected for new signups that require email verification.`)
    return null
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const [user, session] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentSession(),
      ])

      let dbUser: DbUser | null = null
      if (user) {
        dbUser = await getDbUserWithRetry(user.id)
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
  }, [getDbUserWithRetry])

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

  const signInWithPhone = useCallback(async (phone: string, password: string) => {
    try {
      // Create a promise that will be resolved when auth state changes
      const authStatePromise = new Promise<void>((resolve, reject) => {
        pendingSignInRef.current = { resolve, reject }
      })

      // Attempt to sign in with phone and password
      await authService.signInWithPhone(phone, password)

      // Wait for auth state to be updated before resolving
      await authStatePromise
    } catch (error) {
      // Clean up pending promise if sign in fails
      if (pendingSignInRef.current) {
        pendingSignInRef.current = null
      }
      console.error('Sign in with phone error:', error)
      throw error
    }
  }, [])

  const requestPhoneOtp = useCallback(async (phone: string) => {
    try {
      await authService.requestPhoneOtp(phone)
      // OTP sent, no auth state change yet - user needs to verify OTP
    } catch (error) {
      console.error('Request phone OTP error:', error)
      throw error
    }
  }, [])

  const requestPhoneOtpForSignup = useCallback(async (phone: string, userData?: Partial<DbUser>) => {
    try {
      await authService.requestPhoneOtpForSignup(phone, userData)
      // OTP sent for signup, no auth state change yet - user needs to verify OTP
    } catch (error) {
      console.error('Request phone OTP for signup error:', error)
      throw error
    }
  }, [])

  const signUpWithPhone = useCallback(async (phone: string, password: string, userData?: Partial<DbUser>) => {
    try {
      await authService.signUpWithPhone(phone, password, userData)
      // Auth state change will trigger refresh (if no confirmation required)
    } catch (error) {
      console.error('Sign up with phone error:', error)
      throw error
    }
  }, [])

  const verifyOtp = useCallback(async (phone: string, token: string, type: 'sms' | 'phone_change' = 'sms') => {
    try {
      // Create a promise that will be resolved when auth state changes
      const authStatePromise = new Promise<void>((resolve, reject) => {
        pendingSignInRef.current = { resolve, reject }
      })

      // Verify the OTP
      await authService.verifyOtp(phone, token, type)

      // Wait for auth state to be updated before resolving
      await authStatePromise
    } catch (error) {
      // Clean up pending promise if verification fails
      if (pendingSignInRef.current) {
        pendingSignInRef.current = null
      }
      console.error('Verify OTP error:', error)
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

  const updatePhone = useCallback(async (phone: string) => {
    try {
      await authService.updatePhone(phone)
      // This will send an OTP to the new phone number for verification
    } catch (error) {
      console.error('Update phone error:', error)
      throw error
    }
  }, [])

  const updateProfile = useCallback(async (profileData: { firstName?: string; lastName?: string; phone?: string }) => {
    try {
      await authService.updateProfile(profileData)
      // Refresh user data to reflect changes
      await refreshUser()
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }, [refreshUser])

  useEffect(() => {
    // Initial auth state check
    refreshUser()

    // Set up auth state change listener
    const { data: { subscription } } = authService.onAuthStateChange(
      async (user: User | null, session: Session | null) => {
        let dbUser: DbUser | null = null
        if (user) {
          try {
            dbUser = await getDbUserWithRetry(user.id)
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
  }, [refreshUser, getDbUserWithRetry])

  const value: AuthContextType = {
    user: state.user,
    dbUser: state.dbUser,
    session: state.session,
    loading: state.loading,
    signIn,
    signUp,
    signInWithPhone,
    requestPhoneOtp,
    requestPhoneOtpForSignup,
    signUpWithPhone,
    verifyOtp,
    signOut,
    resetPassword,
    updatePassword,
    updatePhone,
    updateProfile,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 