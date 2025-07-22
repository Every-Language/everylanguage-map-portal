import React from 'react';
import { useSelectedProject } from '../../features/dashboard/hooks/useSelectedProject';
import { UserManager } from '../../features/user-management/components';

const ProjectRequiredMessage: React.FC = () => (
  <div className="p-8">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
        Users
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mt-1">
        Manage project users and their roles
      </p>
    </div>

    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 text-center">
      <p className="text-neutral-600 dark:text-neutral-400">
        Please select a project to manage users
      </p>
    </div>
  </div>
);

export const UsersPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();

  if (!selectedProject) {
    return <ProjectRequiredMessage />;
  }

  return (
    <UserManager 
      projectId={selectedProject.id}
      projectName={selectedProject.name}
    />
  );
}; 