import React from 'react';
import { useSelectedProject } from '../../features/dashboard/hooks/useSelectedProject';
import { CommunityCheckTable } from '../../features/community-check/components/CommunityCheckTable';

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Community Check</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review and provide feedback on audio files that are ready for community checking.
        </p>
      </div>

      <CommunityCheckTable 
        onStartChecking={() => {}}
        selectedFileId={undefined}
      />
    </div>
  );
}; 