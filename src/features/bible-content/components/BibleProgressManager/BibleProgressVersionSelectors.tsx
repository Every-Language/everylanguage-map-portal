import React from 'react';
import { Select, SelectItem, Button } from '../../../../shared/design-system';

interface BibleProgressVersionSelectorsProps {
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
    <div className="flex items-center space-x-6">
      {/* Version Type Toggle */}
      <div className="flex items-center space-x-2">
        <Button
          variant={selectedVersionType === 'audio' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleVersionTypeChange('audio')}
        >
          Audio
        </Button>
        <Button
          variant={selectedVersionType === 'text' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleVersionTypeChange('text')}
        >
          Text
        </Button>
      </div>

      {/* Specific Version Selector */}
      <div className="min-w-[200px]">
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
      </div>
    </div>
  );
}; 