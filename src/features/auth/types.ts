import type { Tables } from '@everylanguage/shared-types'
import type { User, Session } from '@supabase/supabase-js'

// Re-export common types
export type { User, Session }

// Database table types
export type DbUser = Tables<'users'>
export type DbProject = Tables<'projects'>  
export type DbLanguageEntity = Tables<'language_entities'>
export type DbRegion = Tables<'regions'>

// User roles - these would come from role assignments in the database
export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'TRANSLATOR' | 'VIEWER'

// Auth context interface
export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData?: Partial<DbUser>) => Promise<void>
  signInWithPhone: (phone: string, password: string) => Promise<void>
  requestPhoneOtp: (phone: string) => Promise<void>
  requestPhoneOtpForSignup: (phone: string, userData?: Partial<DbUser>) => Promise<void>
  signUpWithPhone: (phone: string, password: string, userData?: Partial<DbUser>) => Promise<void>
  verifyOtp: (phone: string, token: string, type?: 'sms' | 'phone_change') => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  updatePhone: (phone: string) => Promise<void>
  updateProfile: (profileData: { firstName?: string; lastName?: string; phone?: string }) => Promise<void>
  refreshUser: () => Promise<void>
}

// Auth state interface
export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

// Permission interfaces
export interface Permission {
  resource: string
  action: string
  condition?: (user: DbUser, context?: unknown) => boolean
}

export interface RolePermissions {
  [key: string]: Permission[]
} 