// Core store types for Zustand state management
import type { User, Session } from '@supabase/supabase-js'
import type { Tables, Database, TablesInsert, TablesUpdate } from '@everylanguage/shared-types'

// Type aliases for better readability
export type DbUser = Tables<'users'>
export type Project = Tables<'projects'>
export type LanguageEntity = Tables<'language_entities'>
export type Region = Tables<'regions'>
export type MediaFile = Tables<'media_files'>
export type MediaFileVerse = Tables<'media_files_verses'>
export type TextVersion = Tables<'text_versions'>
export type VerseText = Tables<'verse_texts'>
export type BibleVersion = Tables<'bible_versions'>
export type Book = Tables<'books'>
export type Chapter = Tables<'chapters'>
export type Verse = Tables<'verses'>

// Enums from database
export type UploadStatus = Database['public']['Enums']['upload_status']
export type PublishStatus = Database['public']['Enums']['publish_status']
export type CheckStatus = Database['public']['Enums']['check_status']
export type MediaType = Database['public']['Enums']['media_type']
export type TargetType = Database['public']['Enums']['target_type']

// Authentication Store Types
export interface AuthState {
  user: User | null
  dbUser: DbUser | null
  session: Session | null
  loading: boolean
  error: string | null
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData?: Partial<DbUser>) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
}

export interface AuthStore extends AuthState, AuthActions {}

// Project Management Store Types
export interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  languageEntities: LanguageEntity[]
  regions: Region[]
  bibleVersions: BibleVersion[]
  loading: boolean
  error: string | null
}

export interface ProjectActions {
  fetchProjects: () => Promise<void>
  createProject: (projectData: TablesInsert<'projects'>) => Promise<Project>
  updateProject: (id: string, updates: TablesUpdate<'projects'>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  fetchLanguageEntities: () => Promise<void>
  fetchRegions: () => Promise<void>
  fetchBibleVersions: () => Promise<void>
  clearError: () => void
}

export interface ProjectStore extends ProjectState, ProjectActions {}

// Upload State Store Types
export interface UploadFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: UploadStatus
  progress: number
  error: string | null
  metadata?: {
    duration?: number
    detectedBook?: string
    detectedChapter?: number
    detectedVerses?: number[]
  }
}

export interface UploadBatch {
  id: string
  files: UploadFile[]
  projectId: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  startedAt?: Date
  completedAt?: Date
  error: string | null
}

export interface UploadState {
  batches: UploadBatch[]
  currentBatch: UploadBatch | null
  isUploading: boolean
  globalProgress: number
  error: string | null
}

export interface UploadActions {
  createBatch: (projectId: string, files: File[]) => string
  startUpload: (batchId: string) => Promise<void>
  pauseUpload: (batchId: string) => void
  resumeUpload: (batchId: string) => void
  cancelUpload: (batchId: string) => void
  removeFile: (batchId: string, fileId: string) => void
  updateFileMetadata: (batchId: string, fileId: string, metadata: UploadFile['metadata']) => void
  clearCompleted: () => void
  clearError: () => void
  
  // Internal helper methods
  uploadSingleFile: (batchId: string, fileId: string) => Promise<void>
  updateFileStatus: (batchId: string, fileId: string, status: UploadStatus) => void
  updateFileProgress: (batchId: string, fileId: string, progress: number) => void
  updateFileError: (batchId: string, fileId: string, error: string) => void
}

export interface UploadStore extends UploadState, UploadActions {}

// UI State Store Types
export interface NotificationItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  timestamp: Date
  actions?: Array<{
    label: string
    onClick: () => void
  }>
}

export interface ModalState {
  isOpen: boolean
  component: React.ComponentType<unknown> | null
  props?: Record<string, unknown>
  options?: {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    closable?: boolean
    closeOnOverlayClick?: boolean
  }
}

export interface UIState {
  notifications: NotificationItem[]
  modal: ModalState
  sidebar: {
    isOpen: boolean
    isCollapsed: boolean
  }
  theme: 'light' | 'dark' | 'auto'
  loading: {
    global: boolean
    actions: Record<string, boolean>
  }
  preferences: {
    language: string
    timezone: string
    audioPlayer: {
      volume: number
      playbackRate: number
    }
  }
}

export interface UIActions {
  // Notifications
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Modal
  openModal: (component: React.ComponentType<unknown>, props?: Record<string, unknown>, options?: ModalState['options']) => void
  closeModal: () => void
  
  // Sidebar
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Theme
  setTheme: (theme: UIState['theme']) => void
  
  // Loading
  setGlobalLoading: (loading: boolean) => void
  setActionLoading: (action: string, loading: boolean) => void
  
  // Preferences
  updatePreferences: (updates: Partial<UIState['preferences']>) => void
}

export interface UIStore extends UIState, UIActions {}

// Store selector helpers
export type StoreSelector<T, U> = (state: T) => U
export type StoreSlice<T> = (set: (partial: Partial<T>) => void, get: () => T) => T 