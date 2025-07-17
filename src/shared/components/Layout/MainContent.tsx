import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({ children }) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden ml-64">
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}; 