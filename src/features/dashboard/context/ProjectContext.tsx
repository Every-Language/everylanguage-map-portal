import React, { createContext, useState, useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { type Project } from '../../../shared/hooks/query/projects'
import { useAuth } from '../../auth/hooks/useAuth'

export interface ProjectContextValue {
  selectedProject: Project | null
  selectedProjectId: string | null
  setSelectedProject: (project: Project | null) => void
  isProjectSelected: boolean
}

// eslint-disable-next-line react-refresh/only-export-components
export const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

const SELECTED_PROJECT_STORAGE_KEY = 'omt_selected_project'

interface ProjectProviderProps {
  children: ReactNode
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null)
  const { user } = useAuth()
  const prevUserIdRef = useRef<string | null>(null)

  // Load selected project from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY)
      if (stored) {
        const project = JSON.parse(stored)
        setSelectedProjectState(project)
      }
    } catch (error) {
      console.warn('Failed to load selected project from localStorage:', error)
      localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY)
    }
  }, [])

  // Clear selection whenever the authenticated user ID changes (logout/login)
  useEffect(() => {
    const currentUserId = user?.id ?? null
    const prevUserId = prevUserIdRef.current

    if (prevUserId !== currentUserId) {
      // If user changed (includes logout), clear selection
      if (selectedProject) {
        setSelectedProjectState(null)
        try {
          localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY)
        } catch (err) {
          console.warn('Failed to remove selected project from localStorage:', err)
        }
      }
      prevUserIdRef.current = currentUserId
    }
  }, [user, selectedProject])

  // Clear or validate selected project when user changes (logout/login as another user)
  useEffect(() => {
    // On logout, always clear (handled above as well)
    if (!user) {
      return
    }

    // If a project is selected but doesn't belong to the current user, clear it
    if (selectedProject && selectedProject.created_by && selectedProject.created_by !== user.id) {
      setSelectedProjectState(null)
      try {
        localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY)
      } catch (err) {
        console.warn('Failed to remove selected project from localStorage:', err)
      }
    }
  }, [user, selectedProject])

  const setSelectedProject = useCallback((project: Project | null) => {
    setSelectedProjectState(project)
    
    // Persist to localStorage
    try {
      if (project) {
        localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, JSON.stringify(project))
      } else {
        localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY)
      }
    } catch (error) {
      console.warn('Failed to save selected project to localStorage:', error)
    }
  }, [])

  const value: ProjectContextValue = {
    selectedProject,
    selectedProjectId: selectedProject?.id || null,
    setSelectedProject,
    isProjectSelected: !!selectedProject
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

 