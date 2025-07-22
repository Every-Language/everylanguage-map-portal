import React from 'react';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { CheckingWorkflow } from '../components/CheckingWorkflow';

const ProjectRequiredMessage: React.FC = () => (
  <div className="p-8">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
        Community Check
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mt-1">
        Review and approve uploaded audio files
      </p>
    </div>

    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 text-center">
      <p className="text-neutral-600 dark:text-neutral-400">
        Please select a project to access community checking
      </p>
    </div>
  </div>
);

export const CommunityCheckPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();

  if (!selectedProject) {
    return <ProjectRequiredMessage />;
  }

  return (
    <CheckingWorkflow 
      projectId={selectedProject.id}
      projectName={selectedProject.name}
    />
  );
}; 