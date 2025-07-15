import { useContext } from 'react'
import { ProjectContext, type ProjectContextValue } from '../context/ProjectContext'

export const useSelectedProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useSelectedProject must be used within a ProjectProvider')
  }
  return context
} 