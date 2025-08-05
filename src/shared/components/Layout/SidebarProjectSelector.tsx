import React, { useState, useMemo } from 'react';
import { useSelectedProject } from '../../../features/dashboard/hooks/useSelectedProject';
import { useLanguageEntitiesByIds } from '../../../shared/hooks/query/language-entities';
import { Button } from '../../design-system/components/Button';
import { ProjectSelectionModal } from './ProjectSelectionModal';
import type { Project } from '../../stores/types';

export const SidebarProjectSelector: React.FC = () => {
  const { selectedProject, setSelectedProject } = useSelectedProject();
  
  // Extract language IDs from selected project
  const languageIds = useMemo(() => {
    const ids: string[] = [];
    if (selectedProject?.source_language_entity_id) ids.push(selectedProject.source_language_entity_id);
    if (selectedProject?.target_language_entity_id) ids.push(selectedProject.target_language_entity_id);
    return ids;
  }, [selectedProject]);
  
  const { data: languageEntities = [], isLoading: languagesLoading } = useLanguageEntitiesByIds(languageIds);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create language lookup map
  const languageLookup = useMemo(() => {
    const map = new Map<string, string>();
    languageEntities.forEach(entity => {
      map.set(entity.id, entity.name);
    });
    return map;
  }, [languageEntities]);

  // Get both source and target language names with loading state
  const targetLanguage = selectedProject && !languagesLoading
    ? languageLookup.get(selectedProject.target_language_entity_id) || 'Unknown'
    : languagesLoading ? 'Loading...' : '';
  
  const sourceLanguage = selectedProject && !languagesLoading
    ? languageLookup.get(selectedProject.source_language_entity_id) || 'Unknown'
    : languagesLoading ? 'Loading...' : '';

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
              <div className="font-medium text-neutral-900 dark:text-neutral-100 text-sm mb-1">
                {selectedProject.name}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-0.5">
                <div className="break-words">
                  <span className="font-medium">Source:</span> {sourceLanguage}
                </div>
                <div className="break-words">
                  <span className="font-medium">Target:</span> {targetLanguage}
                </div>
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