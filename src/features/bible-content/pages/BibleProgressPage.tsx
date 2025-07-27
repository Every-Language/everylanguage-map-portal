import React from 'react';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { BibleProgressManager } from '../components';

const ProjectRequiredMessage: React.FC = () => (
  <div className="p-8">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
        Bible Progress
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mt-1">
        Track recording progress for Bible content
      </p>
    </div>

    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 text-center">
      <p className="text-neutral-600 dark:text-neutral-400">
        Please select a project to view Bible progress
      </p>
    </div>
  </div>
);

export const BibleProgressPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();

  if (!selectedProject) {
    return <ProjectRequiredMessage />;
  }

  return (
    <BibleProgressManager 
      projectName={selectedProject.name}
    />
  );
}; 