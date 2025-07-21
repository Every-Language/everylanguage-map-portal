import React, { useState } from 'react';
import { useSelectedProject } from '../../../features/dashboard/hooks/useSelectedProject';
import { useLanguageEntities } from '../../../shared/hooks/query/language-entities';
import { Button } from '../../design-system/components/Button';
import { ProjectSelectionModal } from './ProjectSelectionModal';
import type { Project } from '../../stores/types';

export const SidebarProjectSelector: React.FC = () => {
  const { selectedProject, setSelectedProject } = useSelectedProject();
  const { data: languageEntities = [] } = useLanguageEntities();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get both source and target language names
  const targetLanguage = selectedProject 
    ? languageEntities.find(lang => lang.id === selectedProject.target_language_entity_id)?.name || 'Unknown'
    : '';
  
  const sourceLanguage = selectedProject 
    ? languageEntities.find(lang => lang.id === selectedProject.source_language_entity_id)?.name || 'Unknown'
    : '';

  return (
    <>
      <div className="px-1">
        <div className="mb-2">
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
            Current Project
          </label>
        </div>
        
        <Button
          variant="ghost"
          onClick={() => setIsModalOpen(true)}
          className="w-full justify-start h-auto p-3 text-left border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
        >
          {selectedProject ? (
            <div className="min-w-0 flex-1">
              <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate text-sm">
                {selectedProject.name}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {sourceLanguage} → {targetLanguage}
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <div className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                Select a project
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose to get started
              </div>
            </div>
          )}
        </Button>
      </div>

      <ProjectSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedProject={selectedProject}
        onProjectSelect={(project: Project) => {
          setSelectedProject(project);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}; 