import React from 'react';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { BibleTextManager } from '../components';

export const BibleTextPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();

  if (!selectedProject) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Project Selected
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please select a project to view Bible text data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BibleTextManager 
      projectId={selectedProject.id}
      projectName={selectedProject.name}
    />
  );
}; 