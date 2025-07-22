import type { User } from '@supabase/supabase-js'
import type { UserRole } from '../types'

// User roles constant
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  TRANSLATOR: 'TRANSLATOR',
  VIEWER: 'VIEWER',
} as const

/**
 * Extract user roles from Supabase user metadata or database user
 * This assumes roles are stored in user_metadata, app_metadata, or will be fetched from database
 */
export function getUserRoles(user: User): string[] {
  // Check app_metadata first (set by admin)
  if (user.app_metadata?.roles) {
    return Array.isArray(user.app_metadata.roles) 
      ? user.app_metadata.roles 
      : [user.app_metadata.roles]
  }
  
  // Check user_metadata (can be set by user)
  if (user.user_metadata?.roles) {
    return Array.isArray(user.user_metadata.roles)
      ? user.user_metadata.roles
      : [user.user_metadata.roles]
  }
  
  // TODO: In the future, we might fetch roles from database using _dbUser
  // For now, default to viewer role
  return ['VIEWER']
}

/**
 * Check if user has any of the required roles - used by ProtectedRoute
 */
export function hasRequiredRole(user: User | null, requiredRoles: string[]): boolean {
  if (!user || requiredRoles.length === 0) {
    return true
  }
  
  const userRoles = getUserRoles(user)
  return requiredRoles.some(role => userRoles.includes(role))
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: User, role: UserRole): boolean {
  const userRoles = getUserRoles(user)
  return userRoles.includes(role)
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(user: User, roles: UserRole[]): boolean {
  const userRoles = getUserRoles(user)
  return roles.some(role => userRoles.includes(role))
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(user: User): boolean {
  return hasRole(user, USER_ROLES.ADMIN)
}

/**
 * Check if user can manage projects
 */
export function canManageProjects(user: User): boolean {
  return hasAnyRole(user, [USER_ROLES.ADMIN, USER_ROLES.PROJECT_MANAGER])
}

/**
 * Check if user can upload audio
 */
export function canUploadAudio(user: User): boolean {
  return !hasRole(user, USER_ROLES.VIEWER) // All roles except viewer can upload
} 