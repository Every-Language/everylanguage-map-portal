import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectItem,
  Checkbox,
  Button,
  LoadingSpinner
} from '../../../../shared/design-system';
import type { VerseTextWithRelations } from '../../../../shared/hooks/query/text-versions';

interface TextVersion {
  id: string;
  name: string;
}

type PublishStatus = 'pending' | 'published' | 'archived';
type SortField = 'verse_text' | 'verse_reference' | 'version' | 'publish_status';



interface BibleTextTableProps {
  filteredAndSortedTexts: VerseTextWithRelations[];
  isLoading: boolean;
  textVersions: TextVersion[];
  
  // Sorting
  sortField: string | null;
  sortDirection: 'asc' | 'desc' | null;
  handleSort: (field: SortField) => void;
  
  // Selection
  selectedItems: string[];
  allCurrentPageSelected: boolean;
  someCurrentPageSelected: boolean;
  handleSelectAll: (checked: boolean) => void;
  handleRowSelect: (id: string, checked: boolean) => void;
  
  // Actions
  handleEditClick: (text: VerseTextWithRelations) => void;
  handlePublishStatusChange: (id: string, status: PublishStatus) => void;
  
  // Bulk operations
  executeBulkOperation: (operationId: string) => void;
  clearSelection: () => void;
  
  // Modals
  openModal: (modalId: string) => void;
}

export const BibleTextTable: React.FC<BibleTextTableProps> = ({
  filteredAndSortedTexts,
  isLoading,
  textVersions,
  sortField,
  sortDirection,
  handleSort,
  selectedItems,
  allCurrentPageSelected,
  someCurrentPageSelected,
  handleSelectAll,
  handleRowSelect,
  handleEditClick,
  handlePublishStatusChange,
  executeBulkOperation,
  clearSelection,
  openModal
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verse Texts ({filteredAndSortedTexts.length} total)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading verse texts...</span>
          </div>
        ) : filteredAndSortedTexts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No verse texts found</p>
            <Button onClick={() => openModal('upload')}>
              Upload Your First Verses
            </Button>
          </div>
        ) : (
          <div className="space-y-4 relative">
            {/* Floating Bulk Operations */}
            {selectedItems.length > 0 && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-blue-50 dark:bg-blue-900/90 border border-blue-200 dark:border-blue-700 rounded-full px-4 py-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {selectedItems.length} verse text{selectedItems.length !== 1 ? 's' : ''} selected
                  </span>
                  <Select 
                    value="bulk-action" 
                    onValueChange={(value) => {
                      if (value !== 'bulk-action') {
                        executeBulkOperation(value);
                      }
                    }}
                  >
                    <SelectItem value="bulk-action">Change Status</SelectItem>
                    <SelectItem value="pending">Set to Pending</SelectItem>
                    <SelectItem value="published">Set to Published</SelectItem>
                    <SelectItem value="archived">Set to Archived</SelectItem>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={clearSelection}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-800"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        <Checkbox
                          checked={allCurrentPageSelected}
                          onCheckedChange={handleSelectAll}
                        />
                        {someCurrentPageSelected && !allCurrentPageSelected && (
                          <div className="absolute w-4 h-4 bg-primary-600 rounded-sm flex items-center justify-center">
                            <div className="w-2 h-0.5 bg-white rounded"></div>
                          </div>
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      <button
                        onClick={() => handleSort('version')}
                        className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <span>Version</span>
                        {sortField === 'version' && (
                          <span className="text-blue-600 dark:text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      <button
                        onClick={() => handleSort('verse_reference')}
                        className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <span>Reference</span>
                        {sortField === 'verse_reference' && (
                          <span className="text-blue-600 dark:text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      <button
                        onClick={() => handleSort('verse_text')}
                        className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <span>Text</span>
                        {sortField === 'verse_text' && (
                          <span className="text-blue-600 dark:text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      <button
                        onClick={() => handleSort('publish_status')}
                        className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <span>Status</span>
                        {sortField === 'publish_status' && (
                          <span className="text-blue-600 dark:text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTexts.map((text: VerseTextWithRelations) => (
                    <tr key={text.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedItems.includes(text.id)}
                          onCheckedChange={(checked) => handleRowSelect(text.id, checked as boolean)}
                        />
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {textVersions?.find(v => v.id === text.text_version_id)?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {text.verses?.chapters?.books?.name || ''} {text.verses?.chapters?.chapter_number || 0}:{text.verses?.verse_number || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="max-w-md">
                          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                            {text.verse_text}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Select 
                            value={text.publish_status || 'pending'} 
                            onValueChange={(value) => handlePublishStatusChange(text.id, value as PublishStatus)}
                          >
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </Select>
                        </div>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(text)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 