import React from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-accent-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 transition-theme">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <MainContent>
          {children}
        </MainContent>
      </div>
    </div>
  );
} 