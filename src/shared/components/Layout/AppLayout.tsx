import React from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-accent-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 transition-theme">
      <Sidebar />
      <MainContent>
        {children}
      </MainContent>
    </div>
  );
}; 