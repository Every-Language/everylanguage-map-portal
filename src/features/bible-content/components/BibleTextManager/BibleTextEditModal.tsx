import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  SearchableSelect,
  Select,
  SelectItem,
  Button
} from '../../../../shared/design-system';

interface TextVersion {
  id: string;
  name: string;
}

interface Book {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
}

interface Verse {
  id: string;
  verse_number: number;
}

interface EditForm {
  data: {
    bookId: string;
    chapterId: string;
    verseId: string;
    verseNumber: string;
    verseText: string;
    textVersionId: string;
    publishStatus: 'pending' | 'published' | 'archived';
  };
  updateField: (field: string, value: string) => void;
}

interface EditMutation {
  isPending: boolean;
}

interface BibleTextEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editForm: EditForm;
  textVersions: TextVersion[];
  books: Book[];
  chapters: Chapter[];
  chapterVerses: Verse[];
  handleSaveEdit: () => void;
  editVerseTextMutation: EditMutation;
}

export const BibleTextEditModal: React.FC<BibleTextEditModalProps> = ({
  open,
  onOpenChange,
  editForm,
  textVersions,
  books,
  chapters,
  chapterVerses,
  handleSaveEdit,
  editVerseTextMutation
}) => {
  const handleEditFormChange = (field: string, value: string) => {
    editForm.updateField(field, value);
    
    // Reset dependent fields when parent changes
    if (field === 'bookId') {
      editForm.updateField('chapterId', '');
      editForm.updateField('verseId', '');
    } else if (field === 'chapterId') {
      editForm.updateField('verseId', '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Edit Verse Text</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Book, Chapter, Verse
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Book</label>
                <SearchableSelect 
                  options={books?.map(book => ({ value: book.id, label: book.name })) || []}
                  value={editForm.data.bookId} 
                  onValueChange={(value) => handleEditFormChange('bookId', value)}
                  placeholder="Select Book"
                  searchPlaceholder="Search books..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Chapter</label>
                <SearchableSelect 
                  options={chapters?.filter(c => c.book_id === editForm.data.bookId)
                    .map(chapter => ({ value: chapter.id, label: `Chapter ${chapter.chapter_number}` })) || []}
                  value={editForm.data.chapterId} 
                  onValueChange={(value) => handleEditFormChange('chapterId', value)}
                  disabled={!editForm.data.bookId}
                  placeholder="Select Chapter"
                  searchPlaceholder="Search chapters..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Verse</label>
                <SearchableSelect 
                  options={chapterVerses?.map(verse => ({ value: verse.id, label: `Verse ${verse.verse_number}` })) || []}
                  value={editForm.data.verseId} 
                  onValueChange={(value) => handleEditFormChange('verseId', value)}
                  disabled={!editForm.data.chapterId}
                  placeholder="Select Verse"
                  searchPlaceholder="Search verses..."
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Text Version
            </label>
            <SearchableSelect 
              options={textVersions?.map(version => ({ value: version.id, label: version.name })) || []}
              value={editForm.data.textVersionId} 
              onValueChange={(value) => handleEditFormChange('textVersionId', value)}
              placeholder="Select Text Version"
              searchPlaceholder="Search versions..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Verse Text
            </label>
            <textarea
              className="w-full min-h-[100px] p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              value={editForm.data.verseText}
              onChange={(e) => handleEditFormChange('verseText', e.target.value)}
              placeholder="Enter verse text..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Publish Status
            </label>
            <Select 
              value={editForm.data.publishStatus} 
              onValueChange={(value) => handleEditFormChange('publishStatus', value)}
            >
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} disabled={editVerseTextMutation.isPending}>
            {editVerseTextMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 