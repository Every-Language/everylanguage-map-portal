import React from 'react';
import { Select, SelectItem } from '../../../../shared/design-system';

interface BibleVersion {
  id: string;
  name: string;
}

interface BibleVersionSelectorProps {
  selectedVersion: string;
  onVersionChange: (versionId: string) => void;
  versions: BibleVersion[];
}

export const BibleVersionSelector: React.FC<BibleVersionSelectorProps> = ({
  selectedVersion,
  onVersionChange,
  versions
}) => {
  return (
    <div className="w-full max-w-xs mb-6">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Bible Version
      </label>
      <Select 
        value={selectedVersion} 
        onValueChange={onVersionChange}
        placeholder="Select Bible version"
      >
        {versions.map((version) => (
          <SelectItem key={version.id} value={version.id}>
            {version.name}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}; 