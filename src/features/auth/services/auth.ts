import { supabase } from '@/shared/services/supabase'
import type { DbUser, User, Session } from '../types'
import { normalizePhoneNumber } from '../utils/phoneValidation'

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
   * 
   * DEPRECATED: After schema migration, this is largely unnecessary since user.id = users.id
   * For most use cases, use user.id directly for created_by fields
   * Only use this method when you specifically need profile data (first_name, last_name, etc.)
   * 
   * RECOMMENDED: Use useUserProfile hook instead for better performance and caching
   * 
   * Note: User records are automatically created by database trigger
   */
  async getDbUser(userId: string): Promise<DbUser | null> {
    try {
      console.log('Fetching dbUser for userId:', userId)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('DbUser query result:', { data, error })

      if (error) {
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
   * Sign in with phone and password
   */
  async signInWithPhone(phone: string, password: string) {
    try {
      console.log('📱 Signing in with phone and password:', phone)
      
      // Normalize phone number for consistent storage
      const normalizedPhone = normalizePhoneNumber(phone)
      console.log('📱 Normalized phone number:', normalizedPhone)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password,
      })

      if (error) {
        throw error
      }

      console.log('✅ Phone sign in successful:', data)
      return data
      
    } catch (error) {
      console.error('Error signing in with phone:', error)
      throw error
    }
  }

  /**
   * Request OTP for phone login (passwordless)
   */
  async requestPhoneOtp(phone: string) {
    try {
      console.log('📱 Requesting OTP for phone:', phone)
      
      // Normalize phone number for consistent storage
      const normalizedPhone = normalizePhoneNumber(phone)
      console.log('📱 Normalized phone number:', normalizedPhone)
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: false, // Prevent automatic user creation for login
        },
      })

      if (error) {
        throw error
      }

      console.log('✅ OTP requested successfully')
      
    } catch (error) {
      console.error('Error requesting phone OTP:', error)
      throw error
    }
  }

  /**
   * Request OTP for phone signup (passwordless)
   * This method allows user creation during signup flow
   */
  async requestPhoneOtpForSignup(phone: string, userData?: Partial<DbUser>) {
    try {
      console.log('📱 Requesting OTP for phone signup:', phone)
      
      // Normalize phone number for consistent storage
      const normalizedPhone = normalizePhoneNumber(phone)
      console.log('📱 Normalized phone number:', normalizedPhone)
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: true, // Allow user creation during signup
          data: userData,
        },
      })

      if (error) {
        throw error
      }

      console.log('✅ Signup OTP requested successfully')
      
    } catch (error) {
      console.error('Error requesting phone OTP for signup:', error)
      throw error
    }
  }

  /**
   * Sign up with phone and password
   */
  async signUpWithPhone(phone: string, password: string, userData?: Partial<DbUser>) {
    try {
      console.log('📱 Signing up with phone:', phone)
      
      // Normalize phone number for consistent storage
      const normalizedPhone = normalizePhoneNumber(phone)
      console.log('📱 Normalized phone number:', normalizedPhone)
      
      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
        options: {
          data: userData,
        },
      })

      if (error) {
        throw error
      }

      console.log('✅ Phone signup successful, now sending verification SMS')
      
      // After successful signup, send verification SMS
      // This ensures the user gets the verification code
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: false, // User already exists
        }
      })

      if (otpError) {
        console.error('Warning: SMS verification could not be sent:', otpError)
        // Don't throw here - signup was successful, just SMS failed
      } else {
        console.log('✅ Verification SMS sent successfully')
      }

      return data
    } catch (error) {
      console.error('Error signing up with phone:', error)
      throw error
    }
  }

  /**
   * Verify OTP for phone authentication
   */
  async verifyOtp(phone: string, token: string, type: 'sms' | 'phone_change' = 'sms') {
    try {
      // Normalize phone number for consistent verification
      const normalizedPhone = normalizePhoneNumber(phone)
      console.log('📱 Verifying OTP for normalized phone:', normalizedPhone)
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type,
      })

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error verifying OTP:', error)
      throw error
    }
  }

  /**
   * Update user's phone number
   */
  async updatePhone(phone: string) {
    try {
      // Normalize phone number for consistent storage
      const normalizedPhone = normalizePhoneNumber(phone)
      console.log('📱 Updating to normalized phone:', normalizedPhone)
      
      const { error } = await supabase.auth.updateUser({ phone: normalizedPhone })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error updating phone:', error)
      throw error
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(profileData: { firstName?: string; lastName?: string; phone?: string }) {
    try {
      console.log('📝 Updating user profile:', profileData)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Prepare update data for auth.users table (via updateUser)
      const authUpdateData: { phone?: string } = {}
      if (profileData.phone) {
        authUpdateData.phone = normalizePhoneNumber(profileData.phone)
      }

      // Update auth user if needed
      if (Object.keys(authUpdateData).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdateData)
        if (authError) {
          throw authError
        }
      }

      // Update database user record
      const dbUpdateData: { 
        updated_at: string;
        first_name?: string;
        last_name?: string;
        phone_number?: string;
      } = {
        updated_at: new Date().toISOString(),
      }
      
      if (profileData.firstName !== undefined) {
        dbUpdateData.first_name = profileData.firstName
      }
      if (profileData.lastName !== undefined) {
        dbUpdateData.last_name = profileData.lastName
      }
      if (profileData.phone !== undefined) {
        dbUpdateData.phone_number = normalizePhoneNumber(profileData.phone)
      }

      const { error: dbError } = await supabase
        .from('users')
        .update(dbUpdateData)
        .eq('id', user.id)

      if (dbError) {
        throw dbError
      }

      console.log('✅ Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
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