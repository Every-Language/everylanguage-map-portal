import { useFetchCollection, useFetchById } from './base-hooks'
import type { TableRow } from './base-hooks'

export type User = TableRow<'users'>

// Hook to fetch all users
export function useUsers() {
  return useFetchCollection('users')
}

// Hook to fetch a single user by ID
export function useUser(id: string | null) {
  return useFetchById('users', id)
}

// Hook to fetch users by role
export function useUsersByRole(role: string | null) {
  return useFetchCollection('users', {
    filters: { role },
    enabled: !!role,
  })
}

// Hook to search users by email
export function useUserByEmail(email: string | null) {
  return useFetchCollection('users', {
    filters: { email },
    enabled: !!email,
  })
} 