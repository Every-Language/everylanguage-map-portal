import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Alert,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../shared/design-system';
import { ImageUploadModal } from '../../features/upload/components/ImageUploadModal';
import { imageService } from '../../shared/services/imageService';
import type { Image, ImageSet } from '../../shared/types/images';
import { PlusIcon, PhotoIcon, PencilIcon, FolderPlusIcon } from '@heroicons/react/24/outline';

interface Filters {
  targetType: string;
  searchText: string;
  setId: string;
}

export const ImagesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState<Filters>({
    targetType: 'all',
    searchText: '',
    setId: 'all'
  });
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateSetModal, setShowCreateSetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState<Image | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [newSetName, setNewSetName] = useState('');
  const [newSetRemotePath, setNewSetRemotePath] = useState('');
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    targetType: 'book' as Image['target_type'],
    targetId: '',
    publishStatus: 'pending' as Image['publish_status']
  });

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

  // Mutations
  const createImageSetMutation = useMutation({
    mutationFn: ({ name, remotePath }: { name: string; remotePath?: string }) => 
      imageService.createImageSet(name, remotePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-sets'] });
      setShowCreateSetModal(false);
      setNewSetName('');
      setNewSetRemotePath('');
    }
  });

  const updateImageMutation = useMutation({
    mutationFn: ({ imageId, targetType, targetId }: { 
      imageId: string; 
      targetType: Image['target_type']; 
      targetId: string;
    }) => imageService.updateImageTarget(imageId, targetType, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setShowEditModal(false);
      setEditingImage(null);
    }
  });

  const updatePublishStatusMutation = useMutation({
    mutationFn: ({ imageId, status }: { imageId: string; status: Image['publish_status'] }) => 
      imageService.updateImagePublishStatus(imageId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
    }
  });

  const batchUpdatePublishStatusMutation = useMutation({
    mutationFn: ({ imageIds, status }: { imageIds: string[]; status: Image['publish_status'] }) => 
      imageService.batchUpdateImagePublishStatus(imageIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setSelectedImages([]);
    }
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

  // Bulk selection handlers
  const allCurrentPageSelected = filteredImages.length > 0 && 
    filteredImages.every(image => selectedImages.includes(image.id));
  const someCurrentPageSelected = filteredImages.some(image => selectedImages.includes(image.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = filteredImages.map(image => image.id);
      setSelectedImages(prev => [...new Set([...prev, ...currentPageIds])]);
    } else {
      const currentPageIds = new Set(filteredImages.map(image => image.id));
      setSelectedImages(prev => prev.filter(id => !currentPageIds.has(id)));
    }
  };

  const handleRowSelect = (imageId: string, checked: boolean) => {
    if (checked) {
      setSelectedImages(prev => [...prev, imageId]);
    } else {
      setSelectedImages(prev => prev.filter(id => id !== imageId));
    }
  };

  // Create image set handlers
  const handleCreateSet = () => {
    if (!newSetName.trim()) return;
    
    createImageSetMutation.mutate({
      name: newSetName.trim(),
      remotePath: newSetRemotePath.trim() || newSetName.trim()
    });
  };

  // Edit handlers
  const handleEditClick = (image: Image) => {
    setEditingImage(image);
    setEditForm({
      targetType: image.target_type,
      targetId: image.target_id,
      publishStatus: image.publish_status
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingImage) return;
    
    try {
      // Update target if changed
      if (editForm.targetType !== editingImage.target_type || editForm.targetId !== editingImage.target_id) {
        await updateImageMutation.mutateAsync({
          imageId: editingImage.id,
          targetType: editForm.targetType,
          targetId: editForm.targetId
        });
      }
      
      // Update publish status if changed
      if (editForm.publishStatus !== editingImage.publish_status) {
        await updatePublishStatusMutation.mutateAsync({
          imageId: editingImage.id,
          status: editForm.publishStatus
        });
      }
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  };

  // Bulk operations
  const handleBulkPublishStatusChange = async (status: Image['publish_status']) => {
    if (selectedImages.length === 0) return;
    
    try {
      await batchUpdatePublishStatusMutation.mutateAsync({
        imageIds: selectedImages,
        status
      });
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  };

  // Individual publish status change
  const handlePublishStatusChange = async (imageId: string, newStatus: Image['publish_status']) => {
    try {
      await updatePublishStatusMutation.mutateAsync({
        imageId,
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Images</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your uploaded images and image sets</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setShowCreateSetModal(true)}>
            <FolderPlusIcon className="h-4 w-4 mr-2" />
            Create Set
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Upload Images
          </Button>
        </div>
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

      {/* Bulk Actions */}
      {selectedImages.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedImages([])}
                >
                  Clear Selection
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 flex-wrap">
                {/* Publish Status Actions */}
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkPublishStatusChange('pending')}
                    disabled={batchUpdatePublishStatusMutation.isPending}
                  >
                    Mark Pending
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkPublishStatusChange('published')}
                    disabled={batchUpdatePublishStatusMutation.isPending}
                  >
                    Publish
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkPublishStatusChange('archived')}
                    disabled={batchUpdatePublishStatusMutation.isPending}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Preview</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Filename</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Target</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Set</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Publish Status</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImages.map((image: Image) => (
                    <tr key={image.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedImages.includes(image.id)}
                          onCheckedChange={(checked) => handleRowSelect(image.id, checked as boolean)}
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
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
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
                          onValueChange={(value) => handlePublishStatusChange(image.id, value as Image['publish_status'])}
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
                            onClick={() => handleEditClick(image)}
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
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <ImageUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadComplete={handleUploadComplete}
      />

      {/* Create Image Set Modal */}
      <Dialog open={showCreateSetModal} onOpenChange={setShowCreateSetModal}>
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
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="Enter set name..."
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Remote Path (optional)
              </label>
              <Input
                value={newSetRemotePath}
                onChange={(e) => setNewSetRemotePath(e.target.value)}
                placeholder="Leave empty to use set name..."
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSetModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSet} 
              disabled={!newSetName.trim() || createImageSetMutation.isPending}
            >
              {createImageSetMutation.isPending ? 'Creating...' : 'Create Set'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Image Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
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
                value={editForm.targetType} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, targetType: value as Image['target_type'] }))}
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
                value={editForm.targetId}
                onChange={(e) => setEditForm(prev => ({ ...prev, targetId: e.target.value }))}
                placeholder="Enter target ID..."
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Publish Status
              </label>
              <Select 
                value={editForm.publishStatus} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, publishStatus: value as Image['publish_status'] }))}
              >
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={updateImageMutation.isPending || updatePublishStatusMutation.isPending}
            >
              {(updateImageMutation.isPending || updatePublishStatusMutation.isPending) ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 