import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Button } from '../../../../shared/design-system';

interface CreateImageSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    name: string;
    remotePath: string;
  };
  onUpdateField: (field: 'name' | 'remotePath', value: string) => void;
  onSubmit: () => void;
  isValid: boolean;
  isPending: boolean;
}

export const CreateImageSetModal: React.FC<CreateImageSetModalProps> = ({
  isOpen,
  onClose,
  formData,
  onUpdateField,
  onSubmit,
  isValid,
  isPending
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create New Image Set</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Set Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => onUpdateField('name', e.target.value)}
              placeholder="Enter set name..."
              className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Remote Path (optional)
            </label>
            <Input
              value={formData.remotePath}
              onChange={(e) => onUpdateField('remotePath', e.target.value)}
              placeholder="Leave empty to use set name..."
              className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={!isValid || isPending}
          >
            {isPending ? 'Creating...' : 'Create Set'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 