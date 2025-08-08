import React, { useEffect, useCallback } from 'react';
import { useSelectedProject } from '../../../features/dashboard/hooks/useSelectedProject';
import { useProjectStore } from '../../stores/project';
import { Select, SelectItem } from '../../design-system';

export const SidebarBibleVersionSelector: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  
  // Use direct store access to avoid selector instability
  const bibleVersions = useProjectStore(state => state.bibleVersions);
  const selectedBibleVersionId = useProjectStore(state => state.selectedBibleVersionId);
  const fetchBibleVersions = useProjectStore(state => state.fetchBibleVersions);
  const setSelectedBibleVersionId = useProjectStore(state => state.setSelectedBibleVersionId);

  // Memoize the change handler to prevent unnecessary re-renders
  const handleVersionChange = useCallback((versionId: string) => {
    setSelectedBibleVersionId(versionId);
  }, [setSelectedBibleVersionId]);

  // Ensure bible versions are loaded, but only run once
  useEffect(() => {
    if (bibleVersions.length === 0) {
      fetchBibleVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove dependencies to prevent infinite loop

  // Don't show if no project is selected
  if (!selectedProject) {
    return null;
  }

  return (
    <div className="px-1">
      <div className="mb-2">
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
          Bible Version
        </label>
      </div>
      
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-md">
        <Select
          value={selectedBibleVersionId || ''}
          onValueChange={handleVersionChange}
          disabled={bibleVersions.length === 0}
        >
          {bibleVersions.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              {version.name}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}; 