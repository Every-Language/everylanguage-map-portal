import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Select,
  SelectItem,
  LoadingSpinner
} from '../../../../shared/design-system';
import type { AudioVersionForm } from '../../hooks/useAudioFileManagement';
import type { BibleVersion } from '../../../../shared/hooks/query/bible-versions';

interface AudioVersionModalProps {
  // Modal state
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Form state
  audioVersionForm: {
    data: AudioVersionForm;
    errors: Record<string, string>;
    isValid: boolean;
    updateField: (field: string, value: string) => void;
    resetForm: () => void;
  };
  
  // Data for dropdowns
  bibleVersions: BibleVersion[];
  
  // Actions
  handleCreateAudioVersion: () => Promise<void>;
  
  // Loading states
  createAudioVersionMutation?: { isPending: boolean };
}

export const AudioVersionModal: React.FC<AudioVersionModalProps> = ({
  open,
  onOpenChange,
  audioVersionForm,
  bibleVersions,
  handleCreateAudioVersion,
  createAudioVersionMutation
}) => {
  const handleCancel = () => {
    onOpenChange(false);
    audioVersionForm.resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create New Audio Version</DialogTitle>
          <DialogDescription>
            Create a new audio version to organize different recordings or translations
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Audio Version Name *
            </label>
            <Input
              type="text"
              placeholder="e.g., Main Recording, Youth Version, Dramatized..."
              value={audioVersionForm.data.name}
              onChange={(e) => audioVersionForm.updateField('name', e.target.value)}
              disabled={createAudioVersionMutation?.isPending}
            />
            {audioVersionForm.errors.name && (
              <p className="text-red-500 text-xs mt-1">{audioVersionForm.errors.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Bible Version *
            </label>
            <Select 
              value={audioVersionForm.data.selectedBibleVersion} 
              onValueChange={(value) => audioVersionForm.updateField('selectedBibleVersion', value)}
              placeholder="Select a Bible version..."
              disabled={createAudioVersionMutation?.isPending}
            >
              {bibleVersions?.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.name}
                </SelectItem>
              ))}
            </Select>
            {audioVersionForm.errors.selectedBibleVersion && (
              <p className="text-red-500 text-xs mt-1">{audioVersionForm.errors.selectedBibleVersion}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={createAudioVersionMutation?.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateAudioVersion}
            disabled={!audioVersionForm.isValid || createAudioVersionMutation?.isPending}
          >
            {createAudioVersionMutation?.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Audio Version'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 