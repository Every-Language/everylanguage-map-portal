import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../features/auth';
import { useTheme } from '../../theme';
import { 
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  Button 
} from '../../design-system';
import { SidebarNavigation } from './SidebarNavigation';
import { SidebarProjectSelector } from './SidebarProjectSelector';

export const Sidebar: React.FC = () => {
  const { user, dbUser, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  };

  return (
    <SidebarContainer>
      <SidebarHeader>
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gradient-to-br from-accent-600 to-accent-800 rounded-lg flex items-center justify-center mr-3">
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
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-black text-neutral-900 dark:text-neutral-100">OMT</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Project Management</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Project Selector */}
        <div className="mb-6">
          <SidebarProjectSelector />
        </div>
        
        {/* Navigation */}
        <SidebarNavigation />
      </SidebarContent>
      
      <SidebarFooter>
        <div className="flex items-center space-x-3 mb-3">
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
        </div>
        
        <div className="flex items-center justify-between">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleThemeToggle}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            title={`Current theme: ${theme}. Click to cycle through themes.`}
          >
            {resolvedTheme === 'light' ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </Button>
          
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
    </SidebarContainer>
  );
}; 