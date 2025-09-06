export type ThemeMode = 'light' | 'dark' | 'auto'

export interface NotificationItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  duration?: number
}

export interface ModalOptions {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
  closeOnOverlayClick?: boolean
}

export interface ModalState {
  isOpen: boolean
  component: React.ComponentType<unknown> | null
  props?: Record<string, unknown>
  options?: ModalOptions
}

export interface SidebarState {
  isOpen: boolean
  isCollapsed: boolean
}

export interface UIState {
  notifications: NotificationItem[]
  modal: ModalState
  sidebar: SidebarState
  theme: ThemeMode
  loading: { global: boolean; actions: Record<string, boolean> }
  preferences: {
    language: string
    timezone: string
    audioPlayer: { volume: number; playbackRate: number }
  }
}

export interface UIStore extends UIState {
  // notifications
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void

  // modal
  openModal: (component: React.ComponentType<unknown>, props?: Record<string, unknown>, options?: ModalOptions) => void
  closeModal: () => void

  // sidebar
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // theme
  setTheme: (theme: ThemeMode) => void

  // loading
  setGlobalLoading: (loading: boolean) => void
  setActionLoading: (action: string, loading: boolean) => void

  // preferences
  updatePreferences: (updates: Partial<UIState['preferences']>) => void
}
