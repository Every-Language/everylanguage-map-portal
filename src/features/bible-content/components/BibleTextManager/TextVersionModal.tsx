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
import type { BibleVersion } from '../../../../shared/hooks/query/bible-versions';

export interface TextVersionForm extends Record<string, unknown> {
  name: string;
  selectedBibleVersion: string;
}

interface TextVersionModalProps {
  // Modal state
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Form state
  textVersionForm: {
    data: TextVersionForm;
    errors: Record<string, string>;
    isValid: boolean;
    updateField: (field: string, value: string) => void;
    resetForm: () => void;
  };
  
  // Data for dropdowns
  bibleVersions: BibleVersion[];
  
  // Actions
  handleCreateTextVersion: () => Promise<void>;
  
  // Loading states
  createTextVersionMutation?: { isPending: boolean };
}

export const TextVersionModal: React.FC<TextVersionModalProps> = ({
  open,
  onOpenChange,
  textVersionForm,
  bibleVersions,
  handleCreateTextVersion,
  createTextVersionMutation
}) => {
  const handleCancel = () => {
    onOpenChange(false);
    textVersionForm.resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create New Text Version</DialogTitle>
          <DialogDescription>
            Create a new text version to organize different translations or text sources
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Text Version Name *
            </label>
            <Input
              type="text"
              placeholder="e.g., Original Translation, Study Version, Children's Bible..."
              value={textVersionForm.data.name}
              onChange={(e) => textVersionForm.updateField('name', e.target.value)}
              disabled={createTextVersionMutation?.isPending}
            />
            {textVersionForm.errors.name && (
              <p className="text-red-500 text-xs mt-1">{textVersionForm.errors.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Bible Version *
            </label>
            <Select 
              value={textVersionForm.data.selectedBibleVersion} 
              onValueChange={(value) => textVersionForm.updateField('selectedBibleVersion', value)}
              placeholder="Select a Bible version..."
              disabled={createTextVersionMutation?.isPending}
            >
              {bibleVersions?.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.name}
                </SelectItem>
              ))}
            </Select>
            {textVersionForm.errors.selectedBibleVersion && (
              <p className="text-red-500 text-xs mt-1">{textVersionForm.errors.selectedBibleVersion}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={createTextVersionMutation?.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateTextVersion}
            disabled={!textVersionForm.isValid || createTextVersionMutation?.isPending}
          >
            {createTextVersionMutation?.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Text Version'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 