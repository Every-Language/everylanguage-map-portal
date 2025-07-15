import React from 'react';
import { useAuth } from '../../features/auth';
import { useTheme } from '../../shared/theme';
import { ProjectProvider, DashboardContent } from '../../features/dashboard';
import { 
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
  Button 
} from '../../shared/design-system';

export const DashboardPage: React.FC = () => {
  const { user, dbUser, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-accent-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 transition-theme">
      {/* Sidebar */}
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg flex items-center justify-center mr-3">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-black text-neutral-900 dark:text-neutral-100">OMT.</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Audio Platform</p>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarNav>
            <SidebarNavItem 
              active={true}
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-5-3-5 3V5z" />
                </svg>
              }
            >
              Dashboard
            </SidebarNavItem>
            
            <SidebarNavItem 
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
            >
              Projects
            </SidebarNavItem>
            
            <SidebarNavItem 
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              }
            >
              Upload
            </SidebarNavItem>
            
            <SidebarNavItem 
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Settings
            </SidebarNavItem>
          </SidebarNav>
        </SidebarContent>
        
        <SidebarFooter>
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-accent-600 to-accent-700 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {dbUser?.first_name && dbUser?.last_name 
                  ? `${dbUser.first_name} ${dbUser.last_name}`
                  : user?.email?.split('@')[0]
                }
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {user?.email}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleSignOut}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              title="Sign out"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <div className="ml-64">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                Welcome back, {dbUser?.first_name || user?.email?.split('@')[0]}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
                className="p-2 rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all duration-200"
                aria-label="Toggle theme"
                title={`Current theme: ${theme}. Click to cycle through light/dark/system themes.`}
              >
                {resolvedTheme === 'light' ? (
                  <svg className="h-5 w-5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Main Content Area with Project Context */}
          <ProjectProvider>
            <DashboardContent />
          </ProjectProvider>
        </div>
      </div>
    </div>
  );
}; 