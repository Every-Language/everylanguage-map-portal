import React from 'react';
import { useSelectedProject } from '../../features/dashboard/hooks/useSelectedProject';
import { AudioFileManager } from '../../features/media-files/components';

export const AudioFilesPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Please select a project to manage audio files.</p>
      </div>
    );
  }

  return (
    <AudioFileManager 
      projectId={selectedProject.id} 
      projectName={selectedProject.name}
    />
  );
}; 