import React, { createContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { type Project } from '../../../shared/hooks/query/projects'

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

 