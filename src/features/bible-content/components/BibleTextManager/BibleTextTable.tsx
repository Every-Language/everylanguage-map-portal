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
  LoadingSpinner,
  Input,
  Pagination
} from '../../../../shared/design-system';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { VerseTextWithRelations } from '../../../../shared/hooks/query/text-versions';

interface BibleTextTableProps {
  filteredAndSortedTexts: VerseTextWithRelations[];
  isLoading: boolean;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (field: string) => void;
  searchText: string;
  onSearchChange: (value: string) => void;
  selectedItems: string[];
  allCurrentPageSelected: boolean;
  someCurrentPageSelected: boolean;
  handleSelectAll: () => void;
  handleRowSelect: (id: string) => void;
  handleEditClick: (text: VerseTextWithRelations) => void;
  handlePublishStatusChange: (textId: string, status: string) => void;
  executeBulkOperation: (operation: string) => void;
  clearSelection: () => void;
  openModal: (modalId: string) => void;
  handleDelete: (textId: string) => void;
  
  // Pagination props
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export const BibleTextTable: React.FC<BibleTextTableProps> = ({
  filteredAndSortedTexts,
  isLoading,
  sortField,
  sortDirection,
  handleSort,
  searchText = '',
  onSearchChange,
  selectedItems,
  allCurrentPageSelected,
  someCurrentPageSelected,
  handleSelectAll,
  handleRowSelect,
  handleEditClick,
  handlePublishStatusChange,
  handleDelete,
  executeBulkOperation,
  clearSelection,
  openModal,
  currentPage = 1,
  itemsPerPage = 25,
  totalItems = 0,
  totalPages = 1,
  onPageChange,
  onPageSizeChange
}) => {
  // Check if we're viewing deleted texts by checking if any texts have deleted_at
  const isViewingDeleted = filteredAndSortedTexts.some(text => text.deleted_at);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Verse Texts ({totalItems} total{totalPages > 1 ? `, showing ${filteredAndSortedTexts.length} on page ${currentPage}` : ''})
          </CardTitle>
          
          {/* Search Bar */}
          {onSearchChange && (
            <div className="w-64">
              <Input
                placeholder="Search in verse text..."
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          )}
        </div>
        
        {/* Deleted Texts Warning Banner */}
        {isViewingDeleted && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                ⚠️ You are currently viewing DELETED verse texts. These texts are not visible to users.
              </span>
            </div>
          </div>
        )}
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
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedItems.length} verse text{selectedItems.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center space-x-2">
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
                      <SelectItem value="restore">Restore</SelectItem>
                    </Select>
                    
                    {/* Delete Button */}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => executeBulkOperation('soft_delete')}
                    >
                      Delete Selected
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Clear Selection
                    </Button>
                  </div>
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
                        onClick={() => handleSort('verse_reference')}
                        className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <span>Verse Reference</span>
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
                  {filteredAndSortedTexts.map((text) => (
                    <tr 
                      key={text.id} 
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        text.deleted_at 
                          ? 'bg-red-50/50 dark:bg-red-900/10 opacity-75' 
                          : ''
                      }`}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selectedItems.includes(text.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleRowSelect(text.id);
                            }
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {text.verses?.chapters?.books?.name || 'Unknown'} {text.verses?.chapters?.chapter_number || 0}:{text.verses?.verse_number || 0}
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
                            onValueChange={(value) => handlePublishStatusChange(text.id, value)}
                          >
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </Select>
                        </div>
                      </td>
                      <td className="p-3">
                        {text.deleted_at ? (
                          // Deleted text - only show restore button
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleRowSelect(text.id);
                              executeBulkOperation('restore');
                            }}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                          >
                            <span className="text-sm">Restore</span>
                          </Button>
                        ) : (
                          // Active text - show edit and delete buttons
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(text)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                            >
                              <PencilIcon className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(text.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && onPageChange && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                  showInfo={true}
                  showSizeChanger={true}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 