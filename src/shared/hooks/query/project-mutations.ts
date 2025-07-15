import { useCreateRecord, useUpdateRecord, useDeleteRecord, useSoftDeleteRecord } from './base-mutations'
import type { TableInsert, TableUpdate } from './base-mutations'

// Create a new project
export function useCreateProject() {
  return useCreateRecord('projects', {
    onSuccess: (project) => {
      console.log('Project created successfully:', project)
    },
    onError: (error) => {
      console.error('Failed to create project:', error)
    },
    // Invalidate related queries when a project is created
    invalidateQueries: [
      ['projects'],
      ['projects', 'by-user']
    ]
  })
}

// Update an existing project
export function useUpdateProject() {
  return useUpdateRecord('projects', {
    onSuccess: (project) => {
      console.log('Project updated successfully:', project)
    },
    onError: (error) => {
      console.error('Failed to update project:', error)
    },
    // Invalidate related queries when a project is updated
    invalidateQueries: [
      ['projects'],
      ['projects', 'by-user']
    ]
  })
}

// Delete a project (hard delete)
export function useDeleteProject() {
  return useDeleteRecord('projects', {
    onSuccess: (id) => {
      console.log('Project deleted successfully:', id)
    },
    onError: (error) => {
      console.error('Failed to delete project:', error)
    },
    // Invalidate related queries when a project is deleted
    invalidateQueries: [
      ['projects'],
      ['projects', 'by-user'],
      ['media_files'],
      ['text_versions']
    ]
  })
}

// Soft delete a project (sets deleted_at)
export function useSoftDeleteProject() {
  return useSoftDeleteRecord('projects', {
    onSuccess: (project) => {
      console.log('Project soft deleted successfully:', project)
    },
    onError: (error) => {
      console.error('Failed to soft delete project:', error)
    },
    // Invalidate related queries when a project is soft deleted
    invalidateQueries: [
      ['projects'],
      ['projects', 'by-user']
    ]
  })
}

// Type helpers for project mutations
export type CreateProjectData = TableInsert<'projects'>
export type UpdateProjectData = TableUpdate<'projects'> 