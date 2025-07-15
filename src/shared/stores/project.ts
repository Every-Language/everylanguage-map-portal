import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { supabase } from '../services/supabase'
import type { 
  ProjectStore, 
  ProjectState, 
  Project
} from './types'
import type { TablesInsert, TablesUpdate } from '@everylanguage/shared-types'

// Initial state
const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  languageEntities: [],
  regions: [],
  bibleVersions: [],
  loading: false,
  error: null,
}

// Create the project store
export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Actions
        fetchProjects: async () => {
          try {
            set({ loading: true, error: null })

            const { data, error } = await supabase
              .from('projects')
              .select('*')
              .order('created_at', { ascending: false })

            if (error) throw error

            set({ projects: data || [], loading: false })
          } catch (error) {
            console.error('Error fetching projects:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to fetch projects' 
            })
          }
        },

        createProject: async (projectData: TablesInsert<'projects'>) => {
          try {
            set({ loading: true, error: null })

            const { data, error } = await supabase
              .from('projects')
              .insert([projectData])
              .select()
              .single()

            if (error) throw error

            // Add the new project to the store
            const currentProjects = get().projects
            set({ 
              projects: [data, ...currentProjects],
              currentProject: data,
              loading: false 
            })

            return data
          } catch (error) {
            console.error('Error creating project:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to create project' 
            })
            throw error
          }
        },

        updateProject: async (id: string, updates: TablesUpdate<'projects'>) => {
          try {
            set({ loading: true, error: null })

            const { data, error } = await supabase
              .from('projects')
              .update(updates)
              .eq('id', id)
              .select()
              .single()

            if (error) throw error

            // Update the project in the store
            const currentProjects = get().projects
            const updatedProjects = currentProjects.map(project => 
              project.id === id ? data : project
            )
            
            set({ 
              projects: updatedProjects,
              currentProject: get().currentProject?.id === id ? data : get().currentProject,
              loading: false 
            })

            return data
          } catch (error) {
            console.error('Error updating project:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to update project' 
            })
            throw error
          }
        },

        deleteProject: async (id: string) => {
          try {
            set({ loading: true, error: null })

            const { error } = await supabase
              .from('projects')
              .delete()
              .eq('id', id)

            if (error) throw error

            // Remove the project from the store
            const currentProjects = get().projects
            const filteredProjects = currentProjects.filter(project => project.id !== id)
            
            set({ 
              projects: filteredProjects,
              currentProject: get().currentProject?.id === id ? null : get().currentProject,
              loading: false 
            })
          } catch (error) {
            console.error('Error deleting project:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to delete project' 
            })
            throw error
          }
        },

        setCurrentProject: (project: Project | null) => {
          set({ currentProject: project })
        },

        fetchLanguageEntities: async () => {
          try {
            set({ loading: true, error: null })

            const { data, error } = await supabase
              .from('language_entities')
              .select('*')
              .order('name')

            if (error) throw error

            set({ languageEntities: data || [], loading: false })
          } catch (error) {
            console.error('Error fetching language entities:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to fetch language entities' 
            })
          }
        },

        fetchRegions: async () => {
          try {
            set({ loading: true, error: null })

            const { data, error } = await supabase
              .from('regions')
              .select('*')
              .order('name')

            if (error) throw error

            set({ regions: data || [], loading: false })
          } catch (error) {
            console.error('Error fetching regions:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to fetch regions' 
            })
          }
        },

        fetchBibleVersions: async () => {
          try {
            set({ loading: true, error: null })

            const { data, error } = await supabase
              .from('bible_versions')
              .select('*')
              .order('name')

            if (error) throw error

            set({ bibleVersions: data || [], loading: false })
          } catch (error) {
            console.error('Error fetching bible versions:', error)
            set({ 
              loading: false, 
              error: error instanceof Error ? error.message : 'Failed to fetch bible versions' 
            })
          }
        },

        clearError: () => {
          set({ error: null })
        },
      }),
      {
        name: 'project-store',
        partialize: (state) => ({
          // Persist projects and current project
          projects: state.projects,
          currentProject: state.currentProject,
          // Don't persist reference data - it should be fresh
        }),
      }
    ),
    {
      name: 'project-store',
    }
  )
)

// Selectors for common use cases
export const useProjects = () => useProjectStore((state) => state.projects)
export const useCurrentProject = () => useProjectStore((state) => state.currentProject)
export const useLanguageEntities = () => useProjectStore((state) => state.languageEntities)
export const useRegions = () => useProjectStore((state) => state.regions)
export const useBibleVersions = () => useProjectStore((state) => state.bibleVersions)
export const useProjectLoading = () => useProjectStore((state) => state.loading)
export const useProjectError = () => useProjectStore((state) => state.error)

// Action selectors
export const useProjectActions = () => useProjectStore((state) => ({
  fetchProjects: state.fetchProjects,
  createProject: state.createProject,
  updateProject: state.updateProject,
  deleteProject: state.deleteProject,
  setCurrentProject: state.setCurrentProject,
  fetchLanguageEntities: state.fetchLanguageEntities,
  fetchRegions: state.fetchRegions,
  fetchBibleVersions: state.fetchBibleVersions,
  clearError: state.clearError,
}))

// Helper selectors
export const useProjectById = (id: string) => 
  useProjectStore((state) => state.projects.find(project => project.id === id))

export const useLanguageEntityById = (id: string) => 
  useProjectStore((state) => state.languageEntities.find(entity => entity.id === id))

export const useRegionById = (id: string) => 
  useProjectStore((state) => state.regions.find(region => region.id === id))

export const useBibleVersionById = (id: string) => 
  useProjectStore((state) => state.bibleVersions.find(version => version.id === id))

// Initialize function to load initial data
export const initializeProjectStore = async () => {
  const { fetchProjects, fetchLanguageEntities, fetchRegions, fetchBibleVersions } = useProjectStore.getState()
  
  // Load all reference data in parallel
  await Promise.all([
    fetchProjects(),
    fetchLanguageEntities(),
    fetchRegions(),
    fetchBibleVersions(),
  ])
} 