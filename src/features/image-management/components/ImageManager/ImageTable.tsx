import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Button, Select, SelectItem, Checkbox } from '../../../../shared/design-system';
import { PhotoIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { Image } from '../../../../shared/types/images';

interface ImageTableProps {
  images: Image[];
  isLoading: boolean;
  selectedImages: string[];
  allCurrentPageSelected: boolean;
  someCurrentPageSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onRowSelect: (imageId: string, checked: boolean) => void;
  onEditClick: (image: Image) => void;
  onPublishStatusChange: (imageId: string, status: Image['publish_status']) => void;
  onOpenUpload: () => void;
  getFilenameFromPath: (remotePath: string) => string;
  getTargetDisplayName: (image: Image) => string;
  getSetName: (image: Image) => string;
  updatePublishStatusPending: boolean;
}

export const ImageTable: React.FC<ImageTableProps> = ({
  images,
  isLoading,
  selectedImages,
  allCurrentPageSelected,
  someCurrentPageSelected,
  onSelectAll,
  onRowSelect,
  onEditClick,
  onPublishStatusChange,
  onOpenUpload,
  getFilenameFromPath,
  getTargetDisplayName,
  getSetName,
  updatePublishStatusPending
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading images...</span>
        </CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Images (0 total)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <PhotoIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No images found</p>
            <Button onClick={onOpenUpload}>
              Upload Your First Images
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Images ({images.length} total)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                  <div className="flex items-center">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      onCheckedChange={onSelectAll}
                    />
                    {someCurrentPageSelected && !allCurrentPageSelected && (
                      <div className="absolute w-4 h-4 bg-primary-600 rounded-sm flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-white rounded"></div>
                      </div>
                    )}
                  </div>
                </th>
                <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Preview</th>
                <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Filename</th>
                <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Target</th>
                <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Set</th>
                <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Publish Status</th>
                <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((image: Image) => (
                <tr key={image.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3">
                    <Checkbox
                      checked={selectedImages.includes(image.id)}
                      onCheckedChange={(checked) => onRowSelect(image.id, checked as boolean)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                      <img
                        src={`${image.remote_path}?width=48&height=48`}
                        alt={getFilenameFromPath(image.remote_path)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <PhotoIcon className="h-6 w-6 text-gray-400 dark:text-gray-600 hidden" />
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {getFilenameFromPath(image.remote_path)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {getTargetDisplayName(image)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {getSetName(image)}
                    </span>
                  </td>
                  <td className="p-3">
                    <Select 
                      value={image.publish_status} 
                      onValueChange={(value) => onPublishStatusChange(image.id, value as Image['publish_status'])}
                      disabled={updatePublishStatusPending}
                    >
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </Select>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditClick(image)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}; 