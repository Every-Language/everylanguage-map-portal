import React, { useState, useEffect } from 'react';
import { useSelectedProject } from '../../../features/dashboard/hooks/useSelectedProject';
import { useBibleVersions } from '../../hooks/query/bible-versions';
import { Select, SelectItem } from '../../design-system';

export const SidebarBibleVersionSelector: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  const { data: bibleVersions = [], isLoading } = useBibleVersions();
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  // Set first version as default when versions load
  useEffect(() => {
    if (bibleVersions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(bibleVersions[0].id);
    }
  }, [bibleVersions, selectedVersionId]);

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
          value={selectedVersionId}
          onValueChange={setSelectedVersionId}
          disabled={isLoading || bibleVersions.length === 0}
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