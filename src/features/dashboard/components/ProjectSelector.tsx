import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, ChevronDown, Clock, Users, Globe, ArrowRight, X } from 'lucide-react'
import { useProjects } from '@/shared/hooks/query/projects'
import { useLanguageEntities } from '@/shared/hooks/query/language-entities'
import { useBibleProjectDashboard } from '@/shared/hooks/query/bible-structure'
import { Button } from '@/shared/design-system/components/Button'
import { Input } from '@/shared/design-system/components/Input'
import { Card } from '@/shared/design-system/components/Card'
import { LoadingSpinner } from '@/shared/design-system/components/LoadingSpinner'
import { Alert, AlertDescription } from '@/shared/design-system/components/Alert'
import { formatDistanceToNow } from 'date-fns'
import type { Project } from '@/shared/stores/types'

interface ProjectWithMetadata extends Project {
  language_name: string
  progress: number
  member_count: number
}

interface ProjectSelectorProps {
  selectedProject: Project | null
  onProjectSelect: (project: Project) => void
  className?: string
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProject,
  onProjectSelect,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [recentProjects, setRecentProjects] = useState<string[]>([])

  // Fetch projects and language entities
  const { data: projects = [], isLoading, error } = useProjects()
  const { data: languageEntities = [] } = useLanguageEntities()

  // Get dashboard data for progress calculation
  const { data: dashboardData } = useBibleProjectDashboard(selectedProject?.id || null)

  // Load recent projects from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recent-projects')
    if (recent) {
      try {
        setRecentProjects(JSON.parse(recent))
      } catch {
        setRecentProjects([])
      }
    }
  }, [])

  // Update recent projects when a project is selected
  const updateRecentProjects = useCallback((projectId: string) => {
    const updated = [projectId, ...recentProjects.filter(id => id !== projectId)].slice(0, 5)
    setRecentProjects(updated)
    localStorage.setItem('recent-projects', JSON.stringify(updated))
  }, [recentProjects])

  // Helper function to safely parse project dates
  const getProjectDate = useCallback((project: Project): Date => {
    const dateString = project.updated_at || project.created_at
    return dateString ? new Date(dateString) : new Date()
  }, [])

  // Handle project selection
  const handleProjectSelect = useCallback((project: Project) => {
    onProjectSelect(project)
    updateRecentProjects(project.id)
    setIsOpen(false)
    setSearchTerm('')
  }, [onProjectSelect, updateRecentProjects])

  // Create language lookup map
  const languageLookup = useMemo(() => {
    const map = new Map<string, string>()
    languageEntities.forEach(entity => {
      map.set(entity.id, entity.name)
    })
    return map
  }, [languageEntities])

  // Calculate progress for a project using real dashboard data
  const calculateProjectProgress = useCallback((projectId: string): number => {
    // If this is the selected project, use the dashboard data
    if (selectedProject?.id === projectId && dashboardData) {
      return dashboardData.overallProgress || 0
    }
    
    // For other projects, we would need to fetch their dashboard data individually
    // This could be optimized later with a batch query or cached data
    return 0
  }, [selectedProject, dashboardData])

  // Enhance projects with real metadata
  const projectsWithMetadata = useMemo((): ProjectWithMetadata[] => {
    return projects.map(project => ({
      ...project,
      language_name: languageLookup.get(project.source_language_entity_id) || 'Unknown',
      progress: calculateProjectProgress(project.id),
      member_count: 1 // TODO: Implement real member count query from project_members table
    }))
  }, [projects, languageLookup, calculateProjectProgress])

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projectsWithMetadata
    
    const term = searchTerm.toLowerCase()
    return projectsWithMetadata.filter(project => 
      project.name.toLowerCase().includes(term) ||
      project.description?.toLowerCase().includes(term) ||
      project.language_name.toLowerCase().includes(term)
    )
  }, [projectsWithMetadata, searchTerm])

  // Sort projects: recent first, then by updated date
  const sortedProjects = useMemo(() => {
    const recent = filteredProjects.filter(p => recentProjects.includes(p.id))
    const others = filteredProjects.filter(p => !recentProjects.includes(p.id))
    
    // Sort recent projects by their position in recentProjects array
    recent.sort((a, b) => recentProjects.indexOf(a.id) - recentProjects.indexOf(b.id))
     
    // Sort other projects by updated date
    others.sort((a, b) => {
      const aDate = getProjectDate(a).getTime()
      const bDate = getProjectDate(b).getTime()
      return bDate - aDate
    })
     
    return [...recent, ...others]
  }, [filteredProjects, recentProjects, getProjectDate])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-project-selector]')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`relative ${className}`} data-project-selector>
      {/* Selected Project Display */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-auto p-4 text-left"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {selectedProject ? (
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {selectedProject.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {selectedProject.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {projectsWithMetadata.find(p => p.id === selectedProject.id)?.language_name || 'Unknown'}
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>1</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Globe className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Select a project
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Choose a project to get started
              </div>
            </div>
          </div>
        )}
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <Card className="max-h-96 overflow-hidden shadow-lg">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Projects List */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-gray-500">Loading projects...</span>
                </div>
              ) : error ? (
                <div className="p-4">
                  <Alert variant="destructive">
                    <AlertDescription>
                      Error loading projects: {error.message}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : sortedProjects.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No projects found matching your search.' : 'No projects found.'}
                </div>
              ) : (
                <div className="p-2">
                  {sortedProjects.map((project) => {
                    const isRecent = recentProjects.includes(project.id)
                    const isSelected = selectedProject?.id === project.id
                    
                    return (
                      <button
                        key={project.id}
                        onClick={() => handleProjectSelect(project)}
                        className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {project.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 dark:text-white truncate">
                                {project.name}
                              </span>
                              {isRecent && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Recent
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {project.description || 'No description'}
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <Globe className="w-3 h-3" />
                                <span>{project.language_name}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <Users className="w-3 h-3" />
                                <span>{project.member_count} member{project.member_count !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDistanceToNow(getProjectDate(project), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex items-center space-x-2">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {project.progress}%
                              </div>
                              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
} 