// Components
export { ProjectSelector } from './components/ProjectSelector'
export { DashboardContent } from './components/DashboardContent'
export { BibleBooksList } from './components/BibleBooksList'

// Enhanced Dashboard Components
export { 
  DashboardOverview,
  ProgressWidgets,
  RecentActivity,
  ProjectInfo,
  BibleVersionSelector 
} from './components/DashboardOverview'

// Shared Components
export { MetricCard, ProgressRing } from './components/shared'

// Context and Providers  
export { ProjectProvider } from './context/ProjectContext'
export type { ProjectContextValue } from './context/ProjectContext'

// Hooks
export { useSelectedProject, useDashboardData } from './hooks' 