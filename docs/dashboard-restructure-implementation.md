# Dashboard Restructure Implementation Guide

## 🚀 Current Status: Phase 1 Complete ✅

**Last Updated**: December 2024  
**Phase 1**: Layout & Navigation - **COMPLETED** ✅  
**Phase 2**: Core Pages - **READY TO START** 🚧  
**Phase 3**: Advanced Features - **PLANNED** 📋

### Quick Start for Next Developer:
1. **What's Done**: Global project selection, sidebar navigation, all 6 pages created with routes
2. **What's Next**: Implement Dashboard page content (recent activity, stats, project metadata)
3. **Dev Server**: Run `npm run dev` - layout is functional, TypeScript warnings are safe to ignore
4. **Key Files**: `src/shared/components/Layout/` contains all new layout components

---

## Original Requirements

i want the project selection to be more global - i.e., the user always has a selected project, and they can navigate to any of the pages but this stays selected globally until another project is selected. lets 

then on the left sidebar, have these navigation tabs (also build the pages for these please):
- dashboard - this shows any recent activity of the project (ie media_files the most recent updated_at), and also stats for bible progress completion (can be calculated based on the total proportion of verses covered between start_verse_id and end_verse_id a media_file), each bible_version can be selected to show the progress for that version. then have the project metadata (name, description, source language, target language, region, users
- bible progress - this displays a selector for the bible_versions, and then underneath that a database-style view of each book, then can expand each book to get the chapters (just like we have now in the dashboard). each shapter should show the verse progress for audio (calculated from the media_files) and for text (calculated from the verse_texts - these will have a project_id field in future, i just havent pushed that yet)
- audio files - this displays a database of all media_files for that project, showing their properties (media_type, is_bible_audio, start_verse_id, end_verse_id, upload_status, check_status, publish_status, also all linked tags) and then allows editing of these fields (except for the statuses). there should also be filters and sort
- bible text - shows a database of all verse_texts for that project, with filters and sorts. also a button to go to the bulk text uploading tool
- community check - this is a filtered view of all media_files for which upload_status is uploaded and check_status is pending
- users - this displays a ui allowing management of the users linked to that project (see my role types in @database.d.ts )

then at the bottom of the left sidebar, have the currentlylogged in user info just like we have and a button to log out

## Overview

This document provides comprehensive implementation guidance for restructuring the OMT Audio Upload Website dashboard to include global project selection and a sidebar navigation system with six main pages.

## Project Context

### Current Architecture
- **Frontend**: React with TypeScript, Tailwind CSS
- **State Management**: Zustand + React Context
- **Database**: Supabase PostgreSQL with comprehensive role-based access system
- **UI Components**: Custom design system with Headless UI and Radix UI primitives
- **Query Management**: TanStack Query for data fetching

### Database Schema Key Tables
- `projects` - Project metadata with language entities and regions
- `media_files` - Audio file storage with verse timing information
- `media_files_verses` - Verse timing mapping
- `verse_texts` - Bible text content linked to text_versions
- `bible_versions` - Bible version references
- `books`, `chapters`, `verses` - Bible structure
- `roles`, `permissions`, `user_roles` - Role-based access control
- `language_entities`, `regions` - Hierarchical location data

## Implementation Requirements

### 1. Global Project Selection Architecture

#### Current System Analysis
- **Existing**: `ProjectContext` in `src/features/dashboard/context/ProjectContext.tsx`
- **Storage**: localStorage persistence with `SELECTED_PROJECT_STORAGE_KEY`
- **State**: Zustand store in `src/shared/stores/project.ts` with `currentProject` field

#### Required Changes
1. **Elevate Project Context**: Move project selection to application level
2. **Global Access**: Make selected project available across all pages
3. **Persistent State**: Maintain current localStorage persistence
4. **Route Protection**: Ensure project selection for protected routes

#### Implementation Steps
```typescript
// 1. Update App.tsx to wrap entire app with ProjectProvider
<ProjectProvider>
  <Router>
    <Routes>
      {/* All routes */}
    </Routes>
  </Router>
</ProjectProvider>

// 2. Create global project selector component for header/navbar
// 3. Update useSelectedProject hook to be available globally
```

### 2. Sidebar Navigation System

#### Design Requirements
- **Position**: Left sidebar, fixed positioning
- **Width**: 256px (w-64)
- **State**: Collapsible/expandable with responsive behavior
- **Styling**: Dark/light theme support matching existing design system

#### Navigation Structure
```typescript
interface NavigationItem {
  id: string
  label: string
  path: string
  icon: React.ComponentType
  description?: string
  requiresProject?: boolean
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { id: 'bible-progress', label: 'Bible Progress', path: '/bible-progress', icon: BookIcon },
  { id: 'audio-files', label: 'Audio Files', path: '/audio-files', icon: AudioIcon },
  { id: 'bible-text', label: 'Bible Text', path: '/bible-text', icon: TextIcon },
  { id: 'community-check', label: 'Community Check', path: '/community-check', icon: CheckIcon },
  { id: 'users', label: 'Users', path: '/users', icon: UsersIcon }
]
```

#### Implementation Components
```typescript
// src/shared/components/Layout/
├── AppLayout.tsx           // Main layout wrapper
├── Sidebar.tsx            // Sidebar container
├── SidebarNavigation.tsx  // Navigation items
├── SidebarHeader.tsx      // Project selector in sidebar
├── SidebarFooter.tsx      // User info and logout
└── MainContent.tsx        // Main content area
```

### 3. Page Implementations

#### 3.1 Dashboard Page (`/dashboard`)

**Purpose**: Recent activity, stats, project metadata

**Data Requirements**:
```typescript
interface DashboardData {
  recentActivity: {
    mediaFiles: MediaFile[]      // Most recent updated_at
    recentUploads: MediaFile[]   // Recent uploads by created_at
    recentTextUpdates: VerseText[] // Recent text changes
  }
  stats: {
    overallProgress: number      // Percentage across all bible versions
    totalVersesCovered: number
    totalVersesInBible: number
    audioFilesCount: number
    textVersionsCount: number
  }
  bibleVersionProgress: {
    [versionId: string]: {
      version: BibleVersion
      progress: number
      versesCovered: number
      totalVerses: number
    }
  }
  projectMetadata: {
    name: string
    description: string
    sourceLanguage: LanguageEntity
    targetLanguage: LanguageEntity
    region: Region
    users: UserRole[]           // Users associated with project
    createdAt: string
    updatedAt: string
  }
}
```

**Key Queries**:
```typescript
// Use existing useBibleProjectDashboard hook
// Add new hooks for recent activity and user management
const useRecentActivity = (projectId: string, limit: number = 10)
const useProjectUsers = (projectId: string)
const useBibleVersionProgress = (projectId: string)
```

**Layout**:
- Recent Activity section (top)
- Progress Statistics with bible version selector
- Project Metadata card (bottom)

#### 3.2 Bible Progress Page (`/bible-progress`)

**Purpose**: Database-style view of Bible books and chapters with progress

**Data Requirements**:
- Reuse existing `useBibleProjectDashboard` hook
- Extend `BibleBooksList` component from `src/features/dashboard/components/BibleBooksList.tsx`

**Features**:
- Bible version selector (dropdown)
- Expandable book/chapter hierarchy
- Audio progress calculation from `media_files` coverage
- Text progress calculation from `verse_texts` coverage
- Color-coded status indicators (complete/in-progress/not-started)

**Implementation**:
```typescript
// Extend existing BibleBooksList component
interface BibleProgressData extends BibleBookWithProgress {
  audioProgress: number      // From media_files coverage
  textProgress: number       // From verse_texts coverage
  combinedProgress: number   // Overall completion
}
```

#### 3.3 Audio Files Page (`/audio-files`)

**Purpose**: Database view of all media_files with editing capabilities

**Data Requirements**:
```typescript
interface AudioFilesData {
  mediaFiles: MediaFile[]
  totalCount: number
  tags: Tag[]                // For tag filtering
  chapters: Chapter[]        // For chapter filtering
  books: Book[]             // For book filtering
}
```

**Features**:
- Sortable/filterable table
- Inline editing for editable fields:
  - `media_type`
  - `is_bible_audio`
  - `start_verse_id`, `end_verse_id`
  - Tags (via `media_files_tags`)
- Read-only status indicators:
  - `upload_status`
  - `check_status` 
  - `publish_status`
- Bulk operations support
- Export functionality

**Table Structure**:
```typescript
interface AudioFileTableRow {
  id: string
  filename: string           // From local_path or remote_path
  book: string              // From verse relationships
  chapter: number           // From verse relationships
  verseRange: string        // start_verse - end_verse
  duration: number          // duration_seconds
  uploadStatus: UploadStatus
  checkStatus: CheckStatus
  publishStatus: PublishStatus
  tags: string[]            // From media_files_tags
  createdAt: string
  updatedAt: string
}
```

#### 3.4 Bible Text Page (`/bible-text`)

**Purpose**: Database view of verse_texts with bulk upload functionality

**Data Requirements**:
```typescript
interface BibleTextData {
  verseTexts: VerseText[]
  textVersions: TextVersion[]
  totalCount: number
  books: Book[]
  chapters: Chapter[]
}
```

**Features**:
- Sortable/filterable table by book, chapter, verse
- Text version filtering
- Bulk text upload tool (CSV import)
- Inline text editing
- Export functionality
- Search within text content

**Implementation Notes**:
- Future: `verse_texts` will have `project_id` field
- For now: Filter by `text_version.language_entity_id = project.target_language_entity_id`

#### 3.5 Community Check Page (`/community-check`)

**Purpose**: Filtered view for community checking workflow

**Data Requirements**:
```typescript
// Filtered query:
// upload_status = 'completed' AND check_status = 'pending'
interface CommunityCheckData {
  pendingFiles: MediaFile[]
  checkingUsers: User[]     // Users with checking permissions
  recentlyChecked: MediaFile[] // Recently approved/rejected
}
```

**Features**:
- Audio player for each file
- Check status controls (approve/reject/requires_review)
- Batch checking operations
- Comments/notes functionality
- Assignment to checkers

#### 3.6 Users Page (`/users`)

**Purpose**: Project user management with role-based access

**Data Requirements**:
```typescript
interface ProjectUsersData {
  users: {
    user: User
    roles: UserRole[]         // Context-specific roles for this project
    permissions: Permission[] // Derived from roles
    lastActivity: string
  }[]
  availableRoles: Role[]
  pendingInvitations: ProjectInvitation[] // If invitation system exists
}
```

**Role System Integration**:
```typescript
// Key database relationships:
// user_roles.context_type = 'project'
// user_roles.context_id = project.id
// permissions.role_id links to roles
// permissions.context_type/context_id for granular permissions
```

**Features**:
- User list with role assignments
- Role management (add/remove roles)
- Invitation system (if implemented)
- Permission viewing (read-only)
- Activity tracking

### 4. Technical Implementation Details

#### 4.1 Route Structure
```typescript
// Update src/App.tsx routes
const routes = [
  { path: '/', element: <Navigate to="/dashboard" /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/bible-progress', element: <BibleProgressPage /> },
  { path: '/audio-files', element: <AudioFilesPage /> },
  { path: '/bible-text', element: <BibleTextPage /> },
  { path: '/community-check', element: <CommunityCheckPage /> },
  { path: '/users', element: <UsersPage /> },
  // Existing routes...
]
```

#### 4.2 Data Fetching Patterns

**Extend Existing Query Hooks**:
```typescript
// src/shared/hooks/query/
├── media-files.ts         // Extend with filtering/sorting
├── verse-texts.ts         // Add project-based queries
├── user-roles.ts          // New: user management queries
├── bible-structure.ts     // Already comprehensive
└── dashboard.ts           // New: dashboard-specific aggregations
```

**New Query Hooks Needed**:
```typescript
// Media Files Management
export const useMediaFiles = (projectId: string, filters?: MediaFileFilters)
export const useMediaFilesByStatus = (projectId: string, status: CheckStatus)
export const useUpdateMediaFile = () // Mutation for editing

// Text Management  
export const useVerseTextsByProject = (projectId: string, filters?: TextFilters)
export const useBulkTextUpload = () // For CSV import

// User Management
export const useProjectUsers = (projectId: string)
export const useUserRoles = (projectId: string, userId: string)
export const useUpdateUserRoles = () // Mutation

// Activity & Stats
export const useRecentActivity = (projectId: string, limit?: number)
export const useProjectStats = (projectId: string)
```

#### 4.3 State Management

**Global Project State**:
```typescript
// Extend existing ProjectContext
interface ProjectContextValue {
  selectedProject: Project | null
  selectedProjectId: string | null
  setSelectedProject: (project: Project | null) => void
  isProjectSelected: boolean
  // Add navigation state
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
}
```

**UI State Management**:
```typescript
// Use existing UIStore for:
// - Sidebar state
// - Modal management
// - Theme management
// - Loading states
```

#### 4.4 Component Architecture

**Layout Components**:
```typescript
// src/shared/components/Layout/
AppLayout.tsx:
```
```jsx
export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedProject } = useSelectedProject()
  const { sidebarCollapsed } = useUI()
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header project={selectedProject} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Sidebar Components**:
```typescript
// Use existing Sidebar components from design system
// Extend with project-specific navigation
```

**Table Components**:
```typescript
// Reusable data table for audio files and text management
// Use existing design system components
// Add sorting, filtering, and pagination
```

### 5. Security & Permissions

#### Role-Based Access Control
```typescript
// Implement permission checking hooks
export const usePermissions = (projectId: string) => {
  // Check user_roles for project context
  // Return permission set for current user
}

export const useCanEdit = (resource: string, projectId: string) => {
  // Check specific permission for resource editing
}
```

#### Route Protection
```typescript
// Extend existing ProtectedRoute component
<ProtectedRoute requiresProject={true} permission="view_project">
  <AudioFilesPage />
</ProtectedRoute>
```

### 6. Performance Optimizations

#### Data Loading
- Use existing TanStack Query caching
- Implement pagination for large datasets
- Add virtualization for large tables
- Use React.memo for expensive list renders

#### Bundle Optimization
- Lazy load page components
- Code splitting by feature
- Optimize existing bundle structure

### 7. Testing Strategy

#### Unit Tests
- Test new query hooks
- Test permission logic
- Test table filtering/sorting
- Component testing for new pages

#### Integration Tests
- Test navigation flows
- Test project selection persistence
- Test role-based access

### 8. Migration Plan

#### Phase 1: Layout & Navigation
1. Implement AppLayout components
2. Update routing structure
3. Add sidebar navigation
4. Test responsive behavior

#### Phase 2: Core Pages
1. Implement Dashboard page
2. Extend Bible Progress page
3. Add basic table views

#### Phase 3: Advanced Features
1. Implement editing capabilities
2. Add bulk operations
3. Implement user management
4. Add community checking workflow

#### Phase 4: Polish & Optimization
1. Performance optimizations
2. Accessibility improvements
3. Advanced filtering/sorting
4. Export functionality

### 9. File Structure

```
src/
├── app/pages/
│   ├── DashboardPage.tsx      # Updated with new content
│   ├── BibleProgressPage.tsx   # New - Bible structure with progress
│   ├── AudioFilesPage.tsx      # New - Media files management
│   ├── BibleTextPage.tsx       # New - Text management
│   ├── CommunityCheckPage.tsx  # New - Checking workflow
│   └── UsersPage.tsx           # New - User management
├── shared/components/Layout/
│   ├── AppLayout.tsx           # New - Main layout wrapper
│   ├── Sidebar.tsx             # New - Sidebar container
│   ├── SidebarNavigation.tsx   # New - Navigation items
│   └── MainContent.tsx         # New - Content area
├── shared/hooks/query/
│   ├── media-files.ts          # Extended - Add filtering
│   ├── verse-texts.ts          # Extended - Add project queries
│   ├── user-roles.ts           # New - User management
│   └── dashboard.ts            # New - Dashboard aggregations
└── features/
    ├── audio-management/       # New - Audio file management
    ├── text-management/        # New - Text management
    ├── community-check/        # New - Checking workflow
    └── user-management/        # New - User & role management
```

### 10. Dependencies

#### New Dependencies (if needed)
- `@tanstack/react-virtual` - For large table virtualization
- `react-window` - Alternative virtualization solution
- `papaparse` - CSV parsing for text uploads

#### Design System Extensions
- Extend existing table components
- Add new icons for navigation
- Extend progress indicators

## Implementation Progress

### ✅ Phase 1: Layout & Navigation - COMPLETED
**Status**: Fully implemented and functional

**What was completed**:
- ✅ Global project selection architecture with `ProjectProvider` at app level
- ✅ Sidebar navigation system with all 6 navigation items
- ✅ Layout components created in `src/shared/components/Layout/`
  - `AppLayout.tsx` - Main layout wrapper
  - `Sidebar.tsx` - Sidebar container with user info and logout
  - `SidebarNavigation.tsx` - Navigation items with active states
  - `SidebarProjectSelector.tsx` - Global project selector
  - `MainContent.tsx` - Content area wrapper
- ✅ Updated routing structure in `src/App.tsx` with new layout
- ✅ Created placeholder pages for all 6 sections:
  - `DashboardPage.tsx` - Updated to use new layout
  - `BibleProgressPage.tsx` - New placeholder
  - `AudioFilesPage.tsx` - New placeholder  
  - `BibleTextPage.tsx` - New placeholder
  - `CommunityCheckPage.tsx` - New placeholder
  - `UsersPage.tsx` - New placeholder
- ✅ Project context now persists across all navigation
- ✅ Responsive design and theme compatibility maintained
- ✅ User info display and logout functionality in sidebar footer

**Files Created/Modified**:
- `src/shared/components/Layout/` - New directory with all layout components
- `src/App.tsx` - Updated with global ProjectProvider and new routes
- `src/app/pages/` - All 6 page components created/updated
- `src/app/pages/DashboardPage.tsx` - Simplified to work with new layout

### 🚧 Phase 2: Core Pages - IN PROGRESS
**Status**: Ready to begin

**Next Steps Required**:
1. **Dashboard Page Implementation** - HIGH PRIORITY
   - Implement recent activity display (most recent `media_files` by `updated_at`)
   - Add project statistics and progress calculations
   - Create bible version progress selector and display
   - Add project metadata display (name, description, languages, region, users)
   - Use existing `useBibleProjectDashboard` hook and extend with new data

2. **Bible Progress Page Enhancement** - HIGH PRIORITY  
   - Extend existing `BibleBooksList` component from dashboard
   - Add bible version selector functionality
   - Display book/chapter hierarchy with progress indicators
   - Calculate audio progress from `media_files` verse coverage
   - Calculate text progress from `verse_texts` coverage
   - Add color-coded status indicators

3. **Basic Table Views** - MEDIUM PRIORITY
   - Create reusable data table components in design system
   - Implement basic read-only views for Audio Files and Bible Text pages
   - Add loading states and error handling

**Technical Notes for Next Developer**:
- All layout infrastructure is complete and working
- Project selection state is managed globally via `ProjectProvider`
- Use existing query hooks in `src/shared/hooks/query/`
- Follow existing design system patterns in `src/shared/design-system/`
- Current TypeScript warnings are about unused imports - safe to ignore during development

### 🔄 Phase 3: Advanced Features - PLANNED
- Editing capabilities for media files and text
- Bulk operations and export functionality  
- User management with role-based permissions
- Community checking workflow

## Original Implementation Priority

1. ~~**High Priority**: Layout restructure and navigation~~ ✅ COMPLETED
2. **High Priority**: Dashboard and Bible Progress pages
3. **Medium Priority**: Audio Files and Bible Text management
4. **Medium Priority**: User management system
5. **Low Priority**: Community Check workflow and advanced features

## Success Criteria

### Phase 1 - Layout & Navigation ✅ COMPLETED
- [x] Global project selection works across all pages
- [x] Sidebar navigation is responsive and functional
- [x] All six pages have routes and basic structure
- [x] Existing functionality is preserved (dashboard, upload workflows)

### Phase 2 - Core Pages 🚧 IN PROGRESS  
- [ ] Dashboard displays recent activity and project statistics
- [ ] Bible Progress page shows book/chapter hierarchy with progress
- [ ] All six pages display appropriate data for selected project

### Phase 3 - Advanced Features 📋 PLANNED
- [ ] Editing capabilities work for media files
- [ ] Text upload functionality is operational  
- [ ] User management respects role-based permissions
- [ ] Performance remains acceptable with larger datasets

## Notes for Implementation

1. **Preserve Existing Functionality**: Ensure current dashboard and upload workflows continue to work
2. **Use Existing Patterns**: Follow established patterns in the codebase for consistency
3. **Responsive Design**: Ensure all new components work on mobile devices
4. **Accessibility**: Follow existing accessibility patterns
5. **Error Handling**: Implement proper error boundaries and user feedback
6. **Loading States**: Use existing loading patterns for data fetching
7. **Theme Support**: Ensure dark/light theme compatibility
8. **Type Safety**: Maintain strict TypeScript typing throughout

This implementation will provide a comprehensive, user-friendly interface for managing Bible translation projects with proper role-based access control and efficient data management capabilities. 