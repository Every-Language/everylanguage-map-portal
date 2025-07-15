import { supabase } from '../../../shared/services/supabase'
import type { DbUser, User, Session } from '../types'

export class AuthService {
  /**
   * Get the current user from Supabase Auth
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Error getting current user:', error)
        return null
      }
      
      return user
    } catch (error) {
      console.error('Unexpected error getting current user:', error)
      return null
    }
  }

  /**
   * Get the current session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting current session:', error)
        return null
      }
      
      return session
    } catch (error) {
      console.error('Unexpected error getting current session:', error)
      return null
    }
  }

  /**
   * Get database user information
   */
  async getDbUser(userId: string): Promise<DbUser | null> {
    try {
      console.log('Fetching dbUser for userId:', userId)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_uid', userId)
        .single()

      console.log('DbUser query result:', { data, error })

      if (error) {
        // If user doesn't exist in the users table, try to create them
        if (error.code === 'PGRST116') {
          console.log('User not found in database, attempting to create...')
          return await this.createDbUserFromAuth(userId)
        }
        console.error('Error getting database user:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Unexpected error getting database user:', error)
      return null
    }
  }

  /**
   * Create database user record from auth user
   */
  private async createDbUserFromAuth(userId: string): Promise<DbUser | null> {
    try {
      // Get the auth user details
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user || user.id !== userId) {
        console.error('Could not get auth user for database creation:', authError)
        return null
      }

      // Extract user data from auth user
      const userData = {
        auth_uid: user.id,
        email: user.email!,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log('Creating user in database:', userData)

      // Create the user record
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single()

      if (error) {
        console.error('Error creating database user:', error)
        return null
      }

      console.log('Successfully created database user:', data)
      return data
    } catch (error) {
      console.error('Unexpected error creating database user:', error)
      return null
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, userData?: Partial<DbUser>) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: 'google' | 'github' | 'facebook') {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error signing in with provider:', error)
      throw error
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  /**
   * Update password
   */
  async updatePassword(password: string) {
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error updating password:', error)
      throw error
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null, session)
    })
  }
}

export const authService = new AuthService() 