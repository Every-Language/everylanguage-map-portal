import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Button, Select, SelectItem } from '../../../../shared/design-system';
import type { Image } from '../../../../shared/types/images';

interface EditImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    targetType: Image['target_type'];
    targetId: string;
    publishStatus: Image['publish_status'];
  };
  onUpdateField: (field: 'targetType' | 'targetId' | 'publishStatus', value: string | Image['target_type'] | Image['publish_status']) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export const EditImageModal: React.FC<EditImageModalProps> = ({
  isOpen,
  onClose,
  formData,
  onUpdateField,
  onSubmit,
  isPending
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Target Type
            </label>
            <Select 
              value={formData.targetType} 
              onValueChange={(value) => onUpdateField('targetType', value as Image['target_type'])}
            >
              <SelectItem value="book">Book</SelectItem>
              <SelectItem value="chapter">Chapter</SelectItem>
              <SelectItem value="verse">Verse</SelectItem>
              <SelectItem value="passage">Passage</SelectItem>
              <SelectItem value="sermon">Sermon</SelectItem>
              <SelectItem value="podcast">Podcast</SelectItem>
              <SelectItem value="film_segment">Film Segment</SelectItem>
              <SelectItem value="audio_segment">Audio Segment</SelectItem>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Target ID
            </label>
            <Input
              value={formData.targetId}
              onChange={(e) => onUpdateField('targetId', e.target.value)}
              placeholder="Enter target ID..."
              className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Publish Status
            </label>
            <Select 
              value={formData.publishStatus} 
              onValueChange={(value) => onUpdateField('publishStatus', value as Image['publish_status'])}
            >
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 