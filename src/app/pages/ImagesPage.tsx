import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../features/auth';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Button,
  LoadingSpinner,
  Select,
  SelectItem,
  Alert
} from '../../shared/design-system';
import { ImageUploadModal } from '../../features/upload/components/ImageUploadModal';
import { imageService } from '../../shared/services/imageService';
import type { Image, ImageSet } from '../../shared/types/images';
import { PlusIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface Filters {
  targetType: string;
  searchText: string;
  setId: string;
}

export const ImagesPage: React.FC = () => {
  const { user } = useAuth();
  
  // State management
  const [filters, setFilters] = useState<Filters>({
    targetType: 'all',
    searchText: '',
    setId: 'all'
  });
  
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Query image sets
  const { data: imageSets = [] } = useQuery({
    queryKey: ['image-sets'],
    queryFn: () => imageService.getImageSets(),
    enabled: !!user
  });

  // Query images
  const { data: images = [], isLoading, refetch } = useQuery({
    queryKey: ['images', filters.setId],
    queryFn: () => imageService.getImages(filters.setId === 'all' ? undefined : filters.setId),
    enabled: !!user
  });

  // Filter images
  const filteredImages = useMemo(() => {
    return images.filter((image: Image) => {
      // Filter by target type
      const matchesTargetType = filters.targetType === 'all' || image.target_type === filters.targetType;
      
      // Filter by search text
      const matchesSearch = !filters.searchText || 
        image.remote_path.toLowerCase().includes(filters.searchText.toLowerCase());
        
      return matchesTargetType && matchesSearch;
    });
  }, [images, filters]);

  // Handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleUploadComplete = () => {
    refetch();
  };



  const getFilenameFromPath = (remotePath: string): string => {
    return remotePath.split('/').pop() || remotePath;
  };

  const getTargetDisplayName = (image: Image): string => {
    // For now, just return the target_type and target_id
    // This could be enhanced to fetch actual book/chapter names
    return `${image.target_type}: ${image.target_id}`;
  };

  const getSetName = (image: Image): string => {
    if (!image.set_id) return 'No Set';
    const set = imageSets.find((s: ImageSet) => s.id === image.set_id);
    return set?.name || 'Unknown Set';
  };

  if (!user) {
    return (
      <Alert variant="warning">
        Please log in to view your images.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Images</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your uploaded images and image sets</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Upload Images
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Target Type</label>
              <Select 
                value={filters.targetType} 
                onValueChange={(value) => handleFilterChange('targetType', value)}
              >
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="book">Book</SelectItem>
                <SelectItem value="chapter">Chapter</SelectItem>
                <SelectItem value="verse">Verse</SelectItem>
                <SelectItem value="passage">Passage</SelectItem>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Image Set</label>
              <Select 
                value={filters.setId} 
                onValueChange={(value) => handleFilterChange('setId', value)}
              >
                <SelectItem value="all">All Sets</SelectItem>
                {imageSets.map((set: ImageSet) => (
                  <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Search</label>
              <Input
                placeholder="Search by filename..."
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images Table */}
      <Card>
        <CardHeader>
          <CardTitle>Images ({filteredImages.length} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading images...</span>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <PhotoIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No images found</p>
              <Button onClick={() => setShowUploadModal(true)}>
                Upload Your First Images
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Preview</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Filename</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Target</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Set</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Status</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImages.map((image: Image) => (
                    <tr key={image.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                          <PhotoIcon className="h-6 w-6 text-gray-400 dark:text-gray-600" />
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
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          image.publish_status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400' :
                          image.publish_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400'
                        }`}>
                          {image.publish_status}
                        </span>
                      </td>
                      <td className="p-3">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <ImageUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}; 