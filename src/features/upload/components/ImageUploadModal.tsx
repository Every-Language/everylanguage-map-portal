import React, { useState, useCallback } from 'react';
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
import { imageService } from '../../../shared/services/imageService';
import { useBooks } from '../../../shared/hooks/query/bible-structure';
import { useImageSets } from '../../../shared/hooks/query/images';
import type { ProcessedImageFile, ImageSet } from '../../../shared/types/images';
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
  const { user, session } = useAuth();
  const { data: books } = useBooks();
  const { data: imageSets = [], isLoading: imageSetsLoading } = useImageSets();
  const [imageFiles, setImageFiles] = useState<ProcessedImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [setSelectionMode, setSetSelectionMode] = useState<'existing' | 'new'>('existing');
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [newSetName, setNewSetName] = useState('');
  
  const { toast } = useToast();

  // Convert image sets to options for SearchableSelect
  const imageSetOptions = imageSets.map((set: ImageSet) => ({
    value: set.id,
    label: set.name
  }));

  // Process uploaded files
  const handleFilesChange = useCallback(async (files: File[]) => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to upload images',
        variant: 'error'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const processedFiles: ProcessedImageFile[] = files.map(file => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const parseResult = parseImageFilename(file.name);
        
        // Find matching book ID
        let detectedBookId: string | undefined;
        if (parseResult.detectedBookOsis && books) {
          const matchingBook = books.find(book => 
            book.name.toLowerCase() === parseResult.detectedBook?.toLowerCase()
          );
          detectedBookId = matchingBook?.id;
        }

        const validationErrors: string[] = [];
        
        // File validation
        if (file.size > 50 * 1024 * 1024) { // 50MB
          validationErrors.push('File size exceeds 50MB limit');
        }
        
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          validationErrors.push('Unsupported file type. Please use JPEG, PNG, GIF, WebP, BMP, or SVG files');
        }

        return {
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          id,
          detectedBookName: parseResult.detectedBook,
          detectedBookId,
          selectedTargetType: 'book' as const,
          selectedTargetId: detectedBookId,
          selectedSetId: undefined, // Will be set later based on user selection
          validationErrors,
          isValid: validationErrors.length === 0 && !!detectedBookId,
          uploadProgress: 0,
          uploadStatus: 'pending' as const
        };
      });

      setImageFiles(prev => [...prev, ...processedFiles]);
      
      const validFiles = processedFiles.filter(f => f.isValid);
      const invalidFiles = processedFiles.filter(f => !f.isValid);
      
      if (invalidFiles.length > 0) {
        toast({
          title: 'Some files have issues',
          description: `${invalidFiles.length} files could not be processed properly`,
          variant: 'warning'
        });
      }
      
      if (validFiles.length > 0) {
        toast({
          title: 'Files processed successfully',
          description: `${validFiles.length} files ready for upload`,
          variant: 'success'
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: 'Processing failed',
        description: 'Failed to process image files. Please try again.',
        variant: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, books, toast]);

  // Update file settings
  const updateFile = useCallback((fileId: string, updates: Partial<ProcessedImageFile>) => {
    setImageFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, ...updates } : file
    ));
  }, []);

  // Delete file
  const handleDeleteFile = useCallback((fileId: string) => {
    setImageFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to upload images',
        variant: 'error'
      });
      return;
    }

    // Validate set selection
    if (setSelectionMode === 'existing' && !selectedSetId) {
      toast({
        title: 'No image set selected',
        description: 'Please select an existing image set or choose to create a new one',
        variant: 'warning'
      });
      return;
    }

    if (setSelectionMode === 'new' && !newSetName.trim()) {
      toast({
        title: 'No set name provided',
        description: 'Please enter a name for the new image set',
        variant: 'warning'
      });
      return;
    }

    const validFiles = imageFiles.filter(file => 
      file.isValid && file.selectedTargetId
    );

    if (validFiles.length === 0) {
      toast({
        title: 'No valid files to upload',
        description: 'Please ensure all files have target selections',
        variant: 'warning'
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get auth token from session
      if (!session?.access_token) {
        throw new Error('No valid auth session found');
      }
      const token = session.access_token;

      let currentSetId = setSelectionMode === 'existing' ? selectedSetId : undefined;

      // Upload each file
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        updateFile(file.id, { uploadStatus: 'uploading', uploadProgress: 0 });

        try {
          const uploadRequest = {
            fileName: file.name,
            target_type: file.selectedTargetType,
            target_id: file.selectedTargetId!,
            // Only create new set for the first image when in 'new' mode
            createNewSet: setSelectionMode === 'new' && i === 0,
            setName: setSelectionMode === 'new' && i === 0 ? newSetName : undefined,
            // Use existing set ID or the set ID from previous upload
            set_id: currentSetId
          };

          const result = await imageService.uploadImage(
            file.file,
            uploadRequest,
            token,
            (progress) => {
              updateFile(file.id, { uploadProgress: progress });
            }
          );

          // If this was the first upload and we created a new set, 
          // store the set ID for subsequent uploads
          if (setSelectionMode === 'new' && i === 0 && result.data?.setId) {
            currentSetId = result.data.setId;
          }

          updateFile(file.id, { uploadStatus: 'success', uploadProgress: 100 });
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          updateFile(file.id, { 
            uploadStatus: 'error', 
            uploadError: error instanceof Error ? error.message : 'Upload failed' 
          });
        }
      }

      const successCount = imageFiles.filter(f => f.uploadStatus === 'success').length;
      
      toast({
        title: 'Upload completed',
        description: `Successfully uploaded ${successCount} images`,
        variant: 'success'
      });

      // Close modal and refresh
      onOpenChange(false);
      onUploadComplete?.();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload images',
        variant: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  }, [user, imageFiles, setSelectionMode, selectedSetId, newSetName, session, updateFile, toast, onOpenChange, onUploadComplete]);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setImageFiles([]);
    setSelectedSetId('');
    setNewSetName('');
    setSetSelectionMode('existing');
  }, []);

  const hasFiles = imageFiles.length > 0;
  const validFiles = imageFiles.filter(f => f.isValid);
  const uploadableFiles = validFiles.filter(f => f.selectedTargetId);
  const canUpload = uploadableFiles.length > 0 && !isUploading && !isProcessing && 
    ((setSelectionMode === 'existing' && selectedSetId) || (setSelectionMode === 'new' && newSetName.trim()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="4xl" className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <PlusIcon className="h-6 w-6" />
            <span>Upload Images</span>
          </DialogTitle>
          <DialogDescription>
            Upload images with automatic book detection from filenames
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Upload Stats */}
          {hasFiles && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {imageFiles.length}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {validFiles.length}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Valid Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {uploadableFiles.length}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Ready to Upload</div>
              </div>
            </div>
          )}

          {/* File Upload Area */}
          <FileUpload
            accept="image/*"
            multiple={true}
            maxFiles={50}
            maxSize={50 * 1024 * 1024}
            onFilesChange={handleFilesChange}
            allowedTypes={SUPPORTED_IMAGE_TYPES}
            uploadText="Drop image files here or click to select"
            showPreview={false}
            className="min-h-[160px]"
            disabled={isUploading || isProcessing}
          />

          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner className="mr-2" />
              <span className="text-neutral-700 dark:text-neutral-300">Processing image files...</span>
            </div>
          )}

          {/* Image Set Selection */}
          {hasFiles && (
            <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Image Set Selection</h3>
              
              {/* Set Selection Mode */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="existing-set"
                    name="setMode"
                    value="existing"
                    checked={setSelectionMode === 'existing'}
                    onChange={() => setSetSelectionMode('existing')}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="existing-set" className="text-sm text-neutral-700 dark:text-neutral-300">
                    Select existing image set
                  </label>
                </div>
                
                {setSelectionMode === 'existing' && (
                  <div className="ml-6">
                    {imageSetsLoading ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner className="h-4 w-4" />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading image sets...</span>
                      </div>
                    ) : imageSetOptions.length > 0 ? (
                      <SearchableSelect
                        value={selectedSetId}
                        onValueChange={setSelectedSetId}
                        placeholder="Search and select an image set..."
                        searchPlaceholder="Search image sets..."
                        options={imageSetOptions}
                        className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                      />
                    ) : (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        No existing image sets found. Create a new one below.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="new-set"
                    name="setMode"
                    value="new"
                    checked={setSelectionMode === 'new'}
                    onChange={() => setSetSelectionMode('new')}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="new-set" className="text-sm text-neutral-700 dark:text-neutral-300">
                    Create new image set
                  </label>
                </div>

                {setSelectionMode === 'new' && (
                  <div className="ml-6">
                    <Input
                      placeholder="Enter set name (e.g., 'Genesis Illustrations')"
                      value={newSetName}
                      onChange={(e) => setNewSetName(e.target.value)}
                      className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File List */}
          {hasFiles && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Image Files</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {imageFiles.map((file) => (
                  <div key={file.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                          <PhotoIcon className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                              {file.name}
                            </h4>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                            {file.detectedBookName && (
                              <p className="text-sm text-green-600 dark:text-green-400">
                                Detected: {file.detectedBookName}
                              </p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Target Type</label>
                              <Select 
                                value={file.selectedTargetType} 
                                onValueChange={(value) => updateFile(file.id, { selectedTargetType: value as 'chapter' | 'book' | 'sermon' | 'passage' | 'verse' | 'podcast' | 'film_segment' | 'audio_segment' })}
                              >
                                <SelectItem value="book">Book</SelectItem>
                                <SelectItem value="chapter">Chapter</SelectItem>
                                <SelectItem value="verse">Verse</SelectItem>
                                <SelectItem value="passage">Passage</SelectItem>
                              </Select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Target</label>
                              <Select 
                                value={file.selectedTargetId || 'placeholder'} 
                                onValueChange={(value) => updateFile(file.id, { selectedTargetId: value === 'placeholder' ? '' : value })}
                              >
                                <SelectItem value="placeholder">Select Target</SelectItem>
                                {books?.filter(book => book.id && book.id.trim()).map(book => (
                                  <SelectItem key={book.id} value={book.id}>{book.name}</SelectItem>
                                ))}
                              </Select>
                            </div>
                          </div>

                          {file.validationErrors.length > 0 && (
                            <div className="text-sm text-red-600 dark:text-red-400">
                              {file.validationErrors.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Instructions:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Filename Examples:</strong> Genesis.jpg, 2Kings.png, John_Chapter3.jpg</li>
              <li>Images are automatically processed to detect book names from filenames</li>
              <li>Select target type and specific target for each image before uploading</li>
              <li>Choose an existing image set or create a new one to organize your images</li>
              <li>Maximum file size: 50MB per file, up to 50 files per batch</li>
              <li>Supported formats: JPEG, PNG, GIF, WebP, BMP, SVG</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
          {hasFiles && (
            <Button
              variant="outline"
              onClick={clearAllFiles}
              disabled={isUploading}
            >
              Clear All
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="outline" disabled={isUploading}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={handleUpload}
            disabled={!canUpload}
            className="flex items-center space-x-2"
          >
            {isUploading && <LoadingSpinner className="h-4 w-4" />}
            <span>
              {isUploading 
                ? 'Uploading...' 
                : `Upload (${uploadableFiles.length} Files)`
              }
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 