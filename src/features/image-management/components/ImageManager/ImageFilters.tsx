import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Select, SelectItem, Input, Button } from '../../../../shared/design-system';
import type { ImageSet } from '../../../../shared/types/images';

interface ImageFiltersProps {
  filters: {
    targetType: string;
    searchText: string;
    setId: string;
  };
  imageSets: ImageSet[];
  onFilterChange: (key: string, value: string) => void;
  selectedCount: number;
  onBulkPublishStatusChange: (status: 'pending' | 'published' | 'archived') => void;
  onClearSelection: () => void;
  batchUpdatePending: boolean;
}

export const ImageFilters: React.FC<ImageFiltersProps> = ({
  filters,
  imageSets,
  onFilterChange,
  selectedCount,
  onBulkPublishStatusChange,
  onClearSelection,
  batchUpdatePending
}) => {
  return (
    <>
      {/* Main Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Target Type
              </label>
              <Select 
                value={filters.targetType} 
                onValueChange={(value) => onFilterChange('targetType', value)}
              >
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="book">Book</SelectItem>
                <SelectItem value="chapter">Chapter</SelectItem>
                <SelectItem value="verse">Verse</SelectItem>
                <SelectItem value="passage">Passage</SelectItem>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Image Set
              </label>
              <Select 
                value={filters.setId} 
                onValueChange={(value) => onFilterChange('setId', value)}
              >
                <SelectItem value="all">All Sets</SelectItem>
                {imageSets.map((set: ImageSet) => (
                  <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Search
              </label>
              <Input
                placeholder="Search by filename..."
                value={filters.searchText}
                onChange={(e) => onFilterChange('searchText', e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Card */}
      {selectedCount > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedCount} image{selectedCount > 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearSelection}
                >
                  Clear Selection
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 flex-wrap">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBulkPublishStatusChange('pending')}
                    disabled={batchUpdatePending}
                  >
                    Mark Pending
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBulkPublishStatusChange('published')}
                    disabled={batchUpdatePending}
                  >
                    Publish
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBulkPublishStatusChange('archived')}
                    disabled={batchUpdatePending}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}; 