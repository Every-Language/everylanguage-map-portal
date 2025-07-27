import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { imageService } from '../../../shared/services/imageService';
import type { Image, ImageSet } from '../../../shared/types/images';

// Types - these would eventually move to the types directory
interface ImageFilters {
  targetType: string;
  searchText: string;
  setId: string;
}

interface CreateSetFormData {
  name: string;
  remotePath: string;
}

interface EditImageFormData {
  targetType: Image['target_type'];
  targetId: string;
  publishStatus: Image['publish_status'];
}

export function useImageManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState<ImageFilters>({
    targetType: 'all',
    searchText: '',
    setId: 'all'
  });
  
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateSetModal, setShowCreateSetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState<Image | null>(null);
  
  // Form state
  const [createSetForm, setCreateSetForm] = useState<CreateSetFormData>({
    name: '',
    remotePath: ''
  });
  
  const [editForm, setEditForm] = useState<EditImageFormData>({
    targetType: 'book',
    targetId: '',
    publishStatus: 'pending'
  });

  // Data fetching
  const { data: imageSets = [] } = useQuery({
    queryKey: ['image-sets'],
    queryFn: () => imageService.getImageSets(),
    enabled: !!user
  });

  const { data: images = [], isLoading, refetch } = useQuery({
    queryKey: ['images', filters.setId],
    queryFn: () => imageService.getImages(filters.setId === 'all' ? undefined : filters.setId),
    enabled: !!user
  });

  // Mutations
  const createImageSetMutation = useMutation({
    mutationFn: ({ name }: { name: string }) =>
      imageService.createImageSet(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-sets'] });
      setShowCreateSetModal(false);
      setCreateSetForm({ name: '', remotePath: '' });
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

  // Selection management
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

  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Upload handlers
  const handleUploadComplete = () => {
    refetch();
  };

  // Create set handlers
  const handleCreateSet = () => {
    if (!createSetForm.name.trim()) return;
    
    createImageSetMutation.mutate({
      name: createSetForm.name.trim()
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

  // Utility functions
  const getFilenameFromPath = (remotePath: string): string => {
    return remotePath.split('/').pop() || remotePath;
  };

  const getTargetDisplayName = (image: Image): string => {
    return `${image.target_type}: ${image.target_id}`;
  };

  const getSetName = (image: Image): string => {
    if (!image.set_id) return 'No Set';
    const set = imageSets.find((s: ImageSet) => s.id === image.set_id);
    return set?.name || 'Unknown Set';
  };

  return {
    // State
    filters,
    selectedImages,
    editingImage,
    
    // Data
    imageSets,
    images,
    filteredImages,
    isLoading,
    
    // Selection state
    selection: {
      allCurrentPageSelected,
      someCurrentPageSelected,
      handleSelectAll,
      handleRowSelect,
      clearSelection: () => setSelectedImages([]),
      selectedCount: selectedImages.length
    },
    
    // Modal management
    modals: {
      showUpload: showUploadModal,
      showCreateSet: showCreateSetModal,
      showEdit: showEditModal,
      openUpload: () => setShowUploadModal(true),
      closeUpload: () => setShowUploadModal(false),
      openCreateSet: () => setShowCreateSetModal(true),
      closeCreateSet: () => setShowCreateSetModal(false),
      openEdit: (image: Image) => handleEditClick(image),
      closeEdit: () => setShowEditModal(false)
    },
    
    // Form management
    createSetForm: {
      data: createSetForm,
      updateField: (field: keyof CreateSetFormData, value: string) => {
        setCreateSetForm(prev => ({ ...prev, [field]: value }));
      },
      resetForm: () => setCreateSetForm({ name: '', remotePath: '' }),
      isValid: Boolean(createSetForm.name.trim())
    },
    
    editForm: {
      data: editForm,
      updateField: (field: keyof EditImageFormData, value: string | Image['target_type'] | Image['publish_status']) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
      }
    },
    
    // Operations
    operations: {
      handleFilterChange,
      handleUploadComplete,
      handleCreateSet,
      handleSaveEdit,
      handleBulkPublishStatusChange,
      handlePublishStatusChange
    },
    
    // Mutations status
    mutations: {
      createImageSet: {
        isPending: createImageSetMutation.isPending
      },
      updateImage: {
        isPending: updateImageMutation.isPending
      },
      updatePublishStatus: {
        isPending: updatePublishStatusMutation.isPending
      },
      batchUpdatePublishStatus: {
        isPending: batchUpdatePublishStatusMutation.isPending
      }
    },
    
    // Utilities
    utils: {
      getFilenameFromPath,
      getTargetDisplayName,
      getSetName
    },
    
    // User state
    user
  };
} 