import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Select,
  SelectItem,
  SearchableSelect
} from '../../../../shared/design-system';
import type { AudioFileEditForm } from '../../hooks/useAudioFileManagement';
import type { Book, Chapter, Verse } from '../../../../shared/hooks/query/bible-structure';

interface AudioFileEditModalProps {
  // Modal state
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Form state
  editForm: {
    data: AudioFileEditForm;
    errors: Record<string, string>;
    isValid: boolean;
    updateField: (field: string, value: string) => void;
  };
  
  // Data for dropdowns
  books: Book[];
  chapters: Chapter[];
  chapterVerses: Verse[];
  
  // Actions
  handleSaveEdit: () => Promise<void>;
  
  // Loading states
  updateMediaFile?: { isPending: boolean };
}

export const AudioFileEditModal: React.FC<AudioFileEditModalProps> = ({
  open,
  onOpenChange,
  editForm,
  books,
  chapters,
  chapterVerses,
  handleSaveEdit,
  updateMediaFile
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Edit Audio File</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Book, Chapter, Verses
            </label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Book</label>
                <SearchableSelect 
                  options={books?.map(book => ({ value: book.id, label: book.name })) || []}
                  value={editForm.data.bookId} 
                  onValueChange={(value) => editForm.updateField('bookId', value)}
                  placeholder="Select Book"
                  searchPlaceholder="Search books..."
                />
                {editForm.errors.bookId && (
                  <p className="text-red-500 text-xs mt-1">{editForm.errors.bookId}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Chapter</label>
                <SearchableSelect 
                  options={chapters?.filter(c => c.book_id === editForm.data.bookId).map(chapter => ({ value: chapter.id, label: `Chapter ${chapter.chapter_number}` })) || []}
                  value={editForm.data.chapterId} 
                  onValueChange={(value) => editForm.updateField('chapterId', value)}
                  disabled={!editForm.data.bookId}
                  placeholder="Select Chapter"
                  searchPlaceholder="Search chapters..."
                />
                {editForm.errors.chapterId && (
                  <p className="text-red-500 text-xs mt-1">{editForm.errors.chapterId}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Verse</label>
                <SearchableSelect 
                  options={chapterVerses?.map(verse => ({ value: verse.id, label: `Verse ${verse.verse_number}` })) || []}
                  value={editForm.data.startVerseId} 
                  onValueChange={(value) => editForm.updateField('startVerseId', value)}
                  disabled={!editForm.data.chapterId}
                  placeholder="Start Verse"
                  searchPlaceholder="Search verses..."
                />
                {editForm.errors.startVerseId && (
                  <p className="text-red-500 text-xs mt-1">{editForm.errors.startVerseId}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Verse</label>
                <SearchableSelect 
                  options={chapterVerses?.map(verse => ({ value: verse.id, label: `Verse ${verse.verse_number}` })) || []}
                  value={editForm.data.endVerseId} 
                  onValueChange={(value) => editForm.updateField('endVerseId', value)}
                  disabled={!editForm.data.chapterId}
                  placeholder="End Verse"
                  searchPlaceholder="Search verses..."
                />
                {editForm.errors.endVerseId && (
                  <p className="text-red-500 text-xs mt-1">{editForm.errors.endVerseId}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Publish Status
            </label>
            <Select 
              value={editForm.data.publishStatus} 
              onValueChange={(value) => editForm.updateField('publishStatus', value)}
            >
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </Select>
            {editForm.errors.publishStatus && (
              <p className="text-red-500 text-xs mt-1">{editForm.errors.publishStatus}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            disabled={updateMediaFile?.isPending || !editForm.isValid}
          >
            {updateMediaFile?.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 