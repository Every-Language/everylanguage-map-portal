import React from 'react';
import { Select, SelectItem, Button } from '../../../../shared/design-system';

interface BibleProgressVersionSelectorsProps {
  // Bible versions
  selectedBibleVersion: string;
  setSelectedBibleVersion: (versionId: string) => void;
  bibleVersions: Array<{ id: string; name: string }>;
  
  // Version type selection
  selectedVersionType: 'audio' | 'text';
  setSelectedVersionType: (type: 'audio' | 'text') => void;
  
  // Version setters
  setSelectedAudioVersion: (versionId: string) => void;
  setSelectedTextVersion: (versionId: string) => void;
  
  // Available versions based on current type
  availableVersions: Array<{ id: string; name: string }>;
  currentVersionId: string;
}

export const BibleProgressVersionSelectors: React.FC<BibleProgressVersionSelectorsProps> = ({
  selectedBibleVersion,
  setSelectedBibleVersion,
  bibleVersions,
  selectedVersionType,
  setSelectedVersionType,
  setSelectedAudioVersion,
  setSelectedTextVersion,
  availableVersions,
  currentVersionId
}) => {
  const handleVersionTypeChange = (type: 'audio' | 'text') => {
    setSelectedVersionType(type);
  };

  const handleVersionChange = (versionId: string) => {
    if (selectedVersionType === 'audio') {
      setSelectedAudioVersion(versionId);
    } else {
      setSelectedTextVersion(versionId);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Bible Version Selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Bible Version
        </label>
        <Select 
          value={selectedBibleVersion} 
          onValueChange={setSelectedBibleVersion}
          placeholder="Select Bible version"
        >
          {bibleVersions.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              {version.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Version Type Toggle */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Content Type
        </label>
        <div className="flex space-x-2">
          <Button
            variant={selectedVersionType === 'audio' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleVersionTypeChange('audio')}
            className="flex-1"
          >
            Audio
          </Button>
          <Button
            variant={selectedVersionType === 'text' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleVersionTypeChange('text')}
            className="flex-1"
          >
            Text
          </Button>
        </div>
      </div>

      {/* Specific Version Selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {selectedVersionType === 'audio' ? 'Audio Version' : 'Text Version'}
        </label>
        <Select 
          value={currentVersionId} 
          onValueChange={handleVersionChange}
          placeholder={`Select ${selectedVersionType} version`}
          disabled={availableVersions.length === 0}
        >
          {availableVersions.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              {version.name}
            </SelectItem>
          ))}
        </Select>
        {availableVersions.length === 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            No {selectedVersionType} versions available for this project
          </p>
        )}
      </div>
    </div>
  );
}; 