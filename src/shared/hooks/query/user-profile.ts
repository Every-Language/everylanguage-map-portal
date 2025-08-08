import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../services/supabase'
import type { TableRow, SupabaseError } from './base-hooks'

export type UserProfile = TableRow<'users'>

/**
 * Hook to fetch user profile data only when needed
 * This is more efficient than always fetching dbUser in AuthContext
 * Use this when you need profile-specific data like first_name, last_name, etc.
 */
export function useUserProfile(userId: string | null, options?: {
  enabled?: boolean
}) {
  return useQuery<UserProfile | null, SupabaseError>({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Handle "not found" errors gracefully
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    },
    enabled: !!userId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes - profile data doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
  })
}

/**
 * Hook to get user display name with fallback logic
 * Uses auth metadata first, then fetches from DB only if needed
 */
export function useUserDisplayName(user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) {
  // First try to get name from auth metadata (fastest)
  const authName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    : null

  // Only fetch profile if we don't have name from auth metadata
  const shouldFetchProfile = !!user && !authName
  const { data: profile } = useUserProfile(user?.id || null, { 
    enabled: shouldFetchProfile 
  })

  // Return name with fallback logic
  if (authName) return authName
  if (profile?.first_name && profile?.last_name) {
    return `${profile.first_name} ${profile.last_name}`
  }
  return user?.email?.split('@')[0] || 'User'
}

/**
 * Hook for components that need full profile data for editing
 * This is separate from display name logic for performance
 */
export function useUserProfileForEditing(userId: string | null) {
  return useUserProfile(userId, { enabled: true })
} 