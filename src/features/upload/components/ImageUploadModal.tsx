import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  FileUpload,
  Button,
  LoadingSpinner,
  Select,
  SelectItem,
  SearchableSelect,
  Input
} from '../../../shared/design-system/components';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { useAuth } from '../../auth';
import { parseImageFilename } from '../../../shared/services/imageFilenameParser';
import { useBooks } from '../../../shared/hooks/query/bible-structure';
import { useImageSets } from '../../../shared/hooks/query/images';
import { useImageUploadStore } from '../../../shared/stores/imageUpload';
import { UploadProgressToast } from '../../../shared/components/UploadProgressToast';
import type { ProcessedImageFile } from '../../../shared/types/images';
import { PlusIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

// Image file types supported
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml'
];

interface ImageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

export function ImageUploadModal({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: ImageUploadModalProps) {
  const { user } = useAuth();
  const { data: books } = useBooks();
  const { data: imageSets = [], isLoading: imageSetsLoading } = useImageSets();
  const [imageFiles, setImageFiles] = useState<ProcessedImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [setSelectionMode, setSetSelectionMode] = useState<'existing' | 'new'>('existing');
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [newSetName, setNewSetName] = useState('');
  
  const { toast } = useToast();

  // Upload store
  const {
    currentBatch,
    isUploading,
    showProgressToast,
    startUpload,
    cancelUpload,
    closeProgressToast,
    setOnUploadComplete,
    setOnBatchComplete,
    resetUploadState
  } = useImageUploadStore();

  // Setup upload callbacks
  useEffect(() => {
    setOnUploadComplete((completedFiles, failedFiles) => {
      console.log('🎉 Image upload completed:', { completedFiles, failedFiles });
      
      if (completedFiles.length > 0) {
        toast({
          title: 'Upload completed',
          description: `Successfully uploaded ${completedFiles.length} image${completedFiles.length !== 1 ? 's' : ''}`,
          variant: 'success'
        });
      }
      
      if (failedFiles.length > 0) {
        toast({
          title: 'Some uploads failed',
          description: `${failedFiles.length} image${failedFiles.length !== 1 ? 's' : ''} failed to upload`,
          variant: 'error'
        });
      }

      onUploadComplete?.();
    });

    setOnBatchComplete((batchProgress) => {
      console.log('📊 Image batch completed:', batchProgress);
    });

    return () => {
      setOnUploadComplete(undefined);
      setOnBatchComplete(undefined);
    };
  }, [setOnUploadComplete, setOnBatchComplete, onUploadComplete, toast]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setImageFiles([]);
      setSelectedSetId('');
      setNewSetName('');
      setSetSelectionMode('existing');
      resetUploadState();
    }
  }, [open, resetUploadState]);

  const handleFileSelection = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    
    try {
      const validFiles = files.filter(file => 
        SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase())
      );

      if (validFiles.length !== files.length) {
        toast({
          title: 'Some files skipped',
          description: `${files.length - validFiles.length} file(s) were skipped due to unsupported format`,
          variant: 'warning'
        });
      }

      const processedFiles: ProcessedImageFile[] = await Promise.all(
        validFiles.map(async (file, index) => {
          const parseResult = parseImageFilename(file.name);
          
          return {
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            id: `${Date.now()}-${index}`,
            detectedBookName: parseResult.detectedBook,
            detectedBookId: parseResult.detectedBookOsis,
            selectedTargetType: 'book',
            selectedTargetId: parseResult.detectedBookOsis || '',
            validationErrors: [],
            isValid: !!parseResult.detectedBook,
            uploadProgress: 0,
            uploadStatus: 'pending',
          };
        })
      );

      setImageFiles(prev => [...prev, ...processedFiles]);
      
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: 'Error processing files',
        description: 'There was an error processing the selected files',
        variant: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const removeFile = useCallback((fileId: string) => {
    setImageFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const updateFile = useCallback((fileId: string, updates: Partial<ProcessedImageFile>) => {
    setImageFiles(prev => 
      prev.map(f => f.id === fileId ? { ...f, ...updates } : f)
    );
  }, []);

  const handleUpload = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to upload images',
        variant: 'error'
      });
      return;
    }

    const validFiles = imageFiles.filter(f => 
      f.isValid && f.selectedTargetId
    );

    if (validFiles.length === 0) {
      toast({
        title: 'No valid files to upload',
        description: 'Please ensure all files have target selections',
        variant: 'warning'
      });
      return;
    }

    // Validate set selection
    if (setSelectionMode === 'existing' && !selectedSetId) {
      toast({
        title: 'Image set required',
        description: 'Please select an image set or create a new one',
        variant: 'warning'
      });
      return;
    }

    if (setSelectionMode === 'new' && !newSetName.trim()) {
      toast({
        title: 'Set name required',
        description: 'Please enter a name for the new image set',
        variant: 'warning'
      });
      return;
    }

    try {
      console.log('🚀 Starting image upload for', validFiles.length, 'files');
      
      const projectData = {
        setId: setSelectionMode === 'existing' ? selectedSetId : undefined,
        setName: setSelectionMode === 'new' ? newSetName.trim() : undefined,
        createNewSet: setSelectionMode === 'new'
      };

      await startUpload(validFiles, projectData, user.id);
      
      // Close modal on successful upload initiation
      onOpenChange(false);
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'There was an error uploading your images',
        variant: 'error'
      });
    }
  }, [user, imageFiles, setSelectionMode, selectedSetId, newSetName, startUpload, onOpenChange, toast]);

  // Get files ready for upload count
  const filesReadyForUpload = imageFiles.filter(f => 
    f.isValid && f.selectedTargetId
  ).length;

  const canUpload = filesReadyForUpload > 0 && 
    ((setSelectionMode === 'existing' && selectedSetId) || 
     (setSelectionMode === 'new' && newSetName.trim()));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload Images</DialogTitle>
            <DialogDescription>
              Upload images and organize them into sets. Supported formats: JPEG, PNG, GIF, WebP, BMP, SVG
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-6">
            {/* File Upload Area */}
            <FileUpload
              accept={SUPPORTED_IMAGE_TYPES.join(',')}
              multiple
              onFilesChange={handleFileSelection}
              disabled={isProcessing || isUploading}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6"
              uploadText={isProcessing ? 'Processing files...' : 'Drop images here or click to browse'}
            />

            {/* Set Selection */}
            {imageFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Select Image Set
                </h3>
                
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="existing"
                      checked={setSelectionMode === 'existing'}
                      onChange={(e) => setSetSelectionMode(e.target.value as 'existing')}
                      className="mr-2"
                    />
                    Use existing set
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="new"
                      checked={setSelectionMode === 'new'}
                      onChange={(e) => setSetSelectionMode(e.target.value as 'new')}
                      className="mr-2"
                    />
                    Create new set
                  </label>
                </div>

                {setSelectionMode === 'existing' && (
                  <Select
                    value={selectedSetId}
                    onValueChange={setSelectedSetId}
                    disabled={imageSetsLoading}
                  >
                    <option value="">Select an image set...</option>
                    {imageSets.map(set => (
                      <SelectItem key={set.id} value={set.id}>
                        {set.name}
                      </SelectItem>
                    ))}
                  </Select>
                )}

                {setSelectionMode === 'new' && (
                  <Input
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    placeholder="Enter new set name..."
                    className="max-w-sm"
                  />
                )}
              </div>
            )}

            {/* File List */}
            {imageFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Files ({imageFiles.length})
                </h3>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {imageFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <PhotoIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* Target Selection */}
                        <div className="min-w-0 flex-1">
                          <SearchableSelect
                            value={file.selectedTargetId || ''}
                            onValueChange={(value: string) => updateFile(file.id, { 
                              selectedTargetId: value,
                              isValid: !!value,
                              validationErrors: value ? [] : ['Target selection required']
                            })}
                            placeholder="Select target..."
                            options={books?.map(book => ({
                              value: book.id,
                              label: book.name
                            })) || []}
                            className="w-40"
                          />
                        </div>

                        {/* Status */}
                        <div className="flex items-center space-x-2">
                          {file.isValid ? (
                            <span className="text-xs text-green-600 dark:text-green-400">✓ Ready</span>
                          ) : (
                            <span className="text-xs text-red-600 dark:text-red-400">! Invalid</span>
                          )}
                        </div>

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          disabled={isUploading}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {filesReadyForUpload} of {imageFiles.length} files ready for upload
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isUploading}>
                Cancel
              </Button>
            </DialogClose>
            <Button 
              onClick={handleUpload}
              disabled={!canUpload || isUploading || isProcessing}
            >
              {isUploading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Upload {filesReadyForUpload} Image{filesReadyForUpload !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Toast */}
      <UploadProgressToast
        batchProgress={currentBatch}
        isVisible={showProgressToast}
        onClose={closeProgressToast}
        onCancel={cancelUpload}
      />
    </>
  );
}