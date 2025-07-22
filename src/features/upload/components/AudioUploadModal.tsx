import React, { useState, useCallback, useRef } from 'react';
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
  Input
} from '../../../shared/design-system/components';
import { AudioFileRow } from './AudioFileRow';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { useAuth } from '../../auth/hooks/useAuth';
import { 
  useAudioVersionsByProject, 
  useCreateAudioVersion
} from '../../../shared/hooks/query/audio-versions';
import { useBibleVersions } from '../../../shared/hooks/query/bible-versions';
import { AudioFileProcessor, type ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';
import { BulkUploadManager, createBulkUploadFiles } from '../../../shared/services/bulkUploadService';
import { supabase } from '../../../shared/services/supabase';
import { PlusIcon } from '@heroicons/react/24/outline';

// Audio file types supported
const SUPPORTED_AUDIO_TYPES = [
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/m4a',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/webm'
];

interface AudioUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

export function AudioUploadModal({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: AudioUploadModalProps) {
  const { selectedProject } = useSelectedProject();
  const { user, dbUser } = useAuth();
  const [audioFiles, setAudioFiles] = useState<ProcessedAudioFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  
  // Audio version selection state
  const [showCreateAudioVersion, setShowCreateAudioVersion] = useState(false);
  const [selectedBibleVersion, setSelectedBibleVersion] = useState<string>('');
  const [newAudioVersionName, setNewAudioVersionName] = useState('');
  const [isCreatingAudioVersion, setIsCreatingAudioVersion] = useState(false);
  
  const { toast } = useToast();
  const audioProcessor = useRef(new AudioFileProcessor()).current;
  
  // Data fetching
  const { data: audioVersions, refetch: refetchAudioVersions } = useAudioVersionsByProject(selectedProject?.id || '');
  const { data: bibleVersions } = useBibleVersions();
  const createAudioVersionMutation = useCreateAudioVersion();

  // Check if we need to show audio version creation
  const needsAudioVersion = !audioVersions || audioVersions.length === 0;

  // Handle file drop/selection
  const handleFilesChange = useCallback(async (files: File[]) => {
    if (!selectedProject) {
      toast({
        title: 'No project selected',
        description: 'Please select a project before uploading files',
        variant: 'error'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const processedFiles = await audioProcessor.processFiles(files);
      setAudioFiles(prev => [...prev, ...processedFiles]);
      
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
        description: 'Failed to process audio files. Please try again.',
        variant: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedProject, audioProcessor, toast]);

  // Handle file updates
  const updateFile = useCallback((fileId: string, updates: Partial<ProcessedAudioFile>) => {
    setAudioFiles(prev => prev.map(file => 
      file.id === fileId ? audioProcessor.updateProcessedFile(file, updates) : file
    ));
  }, [audioProcessor]);

  // Audio playback controls
  const handlePlay = useCallback((fileId: string) => {
    setCurrentlyPlayingId(fileId);
  }, []);

  const handlePause = useCallback(() => {
    setCurrentlyPlayingId(null);
  }, []);

  // File deletion
  const handleDeleteFile = useCallback((fileId: string) => {
    setAudioFiles(prev => prev.filter(file => file.id !== fileId));
    if (currentlyPlayingId === fileId) {
      setCurrentlyPlayingId(null);
    }
  }, [currentlyPlayingId]);

  // Create audio version
  const handleCreateAudioVersion = useCallback(async () => {
    if (!selectedProject || !newAudioVersionName.trim() || !selectedBibleVersion || !dbUser) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'error'
      });
      return;
    }

    setIsCreatingAudioVersion(true);

    try {
      // Use the project's target language entity
      const targetLanguageEntityId = selectedProject.target_language_entity_id;
      
      if (!targetLanguageEntityId) {
        toast({
          title: 'Project configuration error',
          description: 'Project does not have a target language configured',
          variant: 'error'
        });
        setIsCreatingAudioVersion(false);
        return;
      }

      await createAudioVersionMutation.mutateAsync({
        name: newAudioVersionName.trim(),
        language_entity_id: targetLanguageEntityId,
        bible_version_id: selectedBibleVersion,
        project_id: selectedProject.id,
        created_by: dbUser.id
      });

      toast({
        title: 'Audio version created',
        description: `Successfully created audio version "${newAudioVersionName}"`,
        variant: 'success'
      });

      // Reset form and refresh data
      setNewAudioVersionName('');
      setSelectedBibleVersion('');
      setShowCreateAudioVersion(false);
      await refetchAudioVersions();
      setIsCreatingAudioVersion(false);
    } catch (error: unknown) {
      console.error('Error creating audio version:', error);
      toast({
        title: 'Failed to create audio version',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error'
      });
      setIsCreatingAudioVersion(false);
    }
  }, [selectedProject, newAudioVersionName, selectedBibleVersion, createAudioVersionMutation, dbUser, toast, refetchAudioVersions]);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setAudioFiles([]);
    setCurrentlyPlayingId(null);
  }, []);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (isUploading) return;
    clearAllFiles();
    setIsProcessing(false);
    onOpenChange(false);
  }, [isUploading, clearAllFiles, onOpenChange]);

  // Handle bulk upload - NEW IMPLEMENTATION
  const handleUpload = useCallback(async () => {
    if (!selectedProject) {
      toast({
        title: 'No project selected',
        description: 'Please select a project before uploading files',
        variant: 'error'
      });
      return;
    }

    // Check if we have audio versions
    const audioVersionId = audioVersions?.[0]?.id;
    
    if (!audioVersionId) {
      toast({
        title: 'No audio version available',
        description: 'Please create an audio version first before uploading files',
        variant: 'error'
      });
      return;
    }

    // Filter valid files that are ready for upload
    const validFiles = audioFiles.filter(file => 
      file.isValid && 
      file.selectedChapterId && 
      file.selectedStartVerseId && 
      file.selectedEndVerseId
    );

    if (validFiles.length === 0) {
      toast({
        title: 'No valid files to upload',
        description: 'Please ensure all files have book, chapter, and verse selections',
        variant: 'warning'
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Validate target language entity ID exists
      if (!selectedProject.target_language_entity_id) {
        toast({
          title: 'Upload Error',
          description: 'Project target language is not configured. Please contact an administrator.',
          variant: 'destructive',
        });
        return;
      }

      // Create bulk upload files with audio version ID
      const bulkUploadFiles = createBulkUploadFiles(
        validFiles,
        selectedProject.id,
        selectedProject.target_language_entity_id,
        audioVersionId // Add the audio version ID
      );

      // Create bulk upload manager (without progress callback since modal will close)
      const uploadManager = new BulkUploadManager();

      // Start bulk upload
      const result = await uploadManager.startBulkUpload(bulkUploadFiles, session.access_token);

      // Show success message
      toast({
        title: 'Upload started',
        description: `Started uploading ${validFiles.length} files. You can view progress in the Audio Files page.`,
        variant: 'success'
      });

      // Close modal immediately after initiating upload
      handleClose();

      // Trigger refresh of audio files page
      onUploadComplete?.();

      console.log('✅ Bulk upload initiated successfully:', result);

    } catch (error) {
      console.error('❌ Bulk upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to start upload',
        variant: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedProject, audioVersions, audioFiles, toast, onUploadComplete, handleClose]);

  const hasFiles = audioFiles.length > 0;
  const validFiles = audioFiles.filter(f => f.isValid);
  const uploadableFiles = validFiles.filter(f => 
    f.selectedChapterId && f.selectedStartVerseId && f.selectedEndVerseId
  );
  const canUpload = uploadableFiles.length > 0 && !isUploading && !isProcessing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="6xl" className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <PlusIcon className="h-6 w-6" />
            <span>Upload Audio Files</span>
          </DialogTitle>
          <DialogDescription>
            Upload audio files with automatic verse detection and book/chapter selection
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Check for user authentication */}
          {!user || !dbUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Authentication Required
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {!user ? 'Please log in to upload audio files.' : 'Loading user profile...'}
                </p>
              </div>
            </div>
          ) : needsAudioVersion ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <PlusIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    Create Audio Version First
                  </h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  No audio versions exist for this project. Please create one to organize your audio recordings.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="audioVersionName" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Audio Version Name
                    </label>
                    <Input
                      id="audioVersionName"
                      type="text"
                      placeholder="e.g., Main Recording, Dramatized Version"
                      value={newAudioVersionName}
                      onChange={(e) => setNewAudioVersionName(e.target.value)}
                      disabled={isCreatingAudioVersion}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="bibleVersion" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Bible Version
                    </label>
                    <Select 
                      value={selectedBibleVersion} 
                      onValueChange={setSelectedBibleVersion}
                      placeholder="Select a Bible version..."
                    >
                      {bibleVersions?.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleCreateAudioVersion}
                      disabled={!newAudioVersionName || !selectedBibleVersion || isCreatingAudioVersion}
                      className="flex items-center space-x-2"
                    >
                      {isCreatingAudioVersion && <LoadingSpinner className="h-4 w-4" />}
                      <span>
                        {isCreatingAudioVersion ? 'Creating...' : 'Create Audio Version'}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Upload Stats */}
              {hasFiles && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {audioFiles.length}
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

              {/* Show current audio version */}
              {!needsAudioVersion && !showCreateAudioVersion && !hasFiles && (
                <div className="flex justify-between items-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      Using audio version: <span className="font-medium">{audioVersions?.[0]?.name}</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateAudioVersion(true)}
                    className="flex items-center space-x-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Create New</span>
                  </Button>
                </div>
              )}

              {/* Audio Version Creation Form (when user clicks "Create New") */}
              {showCreateAudioVersion && !hasFiles && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
                        Create New Audio Version
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateAudioVersion(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">
                          Audio Version Name *
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g., Main Recording, Youth Version..."
                          value={newAudioVersionName}
                          onChange={(e) => setNewAudioVersionName(e.target.value)}
                          className="dark:bg-blue-800/10 dark:border-blue-600 dark:text-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">
                          Bible Version *
                        </label>
                        <Select 
                          value={selectedBibleVersion} 
                          onValueChange={setSelectedBibleVersion}
                          placeholder="Select a Bible version..."
                        >
                          {bibleVersions?.map((version) => (
                            <SelectItem key={version.id} value={version.id}>
                              {version.name}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>

                      <Button
                        onClick={handleCreateAudioVersion}
                        disabled={isCreatingAudioVersion || !newAudioVersionName.trim() || !selectedBibleVersion}
                        className="w-full"
                      >
                        {isCreatingAudioVersion ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Creating Audio Version...
                          </>
                        ) : (
                          'Create Audio Version'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* File Upload Area */}
              {!needsAudioVersion && !showCreateAudioVersion && (
                <FileUpload
                  accept="audio/*"
                  multiple={true}
                  maxFiles={50}
                  maxSize={500 * 1024 * 1024}
                  onFilesChange={handleFilesChange}
                  allowedTypes={SUPPORTED_AUDIO_TYPES}
                  uploadText="Drop audio files here or click to select"
                  showPreview={false}
                  className="min-h-[160px]"
                  disabled={isUploading || isProcessing}
                />
              )}

              {isProcessing && (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner className="mr-2" />
                  <span className="text-neutral-700 dark:text-neutral-300">Processing audio files and extracting metadata...</span>
                </div>
              )}

              {/* File List */}
              {hasFiles && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Audio Files</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {audioFiles.map((file) => (
                      <AudioFileRow
                        key={file.id}
                        file={file}
                        projectId={selectedProject?.id || ''}
                        isPlaying={currentlyPlayingId === file.id}
                        onPlay={() => handlePlay(file.id)}
                        onPause={handlePause}
                        onDelete={() => handleDeleteFile(file.id)}
                        onBookChange={(bookId) => updateFile(file.id, { selectedBookId: bookId })}
                        onChapterChange={(chapterId) => updateFile(file.id, { selectedChapterId: chapterId })}
                        onStartVerseChange={(verseId) => updateFile(file.id, { selectedStartVerseId: verseId })}
                        onEndVerseChange={(verseId) => updateFile(file.id, { selectedEndVerseId: verseId })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Updated Instructions */}
              {!needsAudioVersion && !showCreateAudioVersion && (
                <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Instructions:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Filename Format:</strong> Please name your files as: <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-900 dark:text-neutral-100">Language_BookName_ChapterXXX_VXXX_XXX.mp3</code></li>
                    <li><strong>Example:</strong> <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-900 dark:text-neutral-100">Bajhangi_2 Kings_Chapter001_V001_018.mp3</code> (2 Kings chapter 1, verses 1-18)</li>
                    <li><strong>Example:</strong> <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-900 dark:text-neutral-100">Bajhangi_Psalms_Chapter089_V027_052.mp3</code> (Psalms chapter 89, verses 27-52)</li>
                    <li>Files are automatically processed to detect book, chapter, and verses from filenames</li>
                    <li>Select book, chapter, and verse range for each file before uploading</li>
                    <li>Only one audio file can play at a time</li>
                    <li>Maximum file size: 500MB per file, up to 50 files per batch</li>
                    <li><strong>Background Upload:</strong> After clicking upload, this modal will close and uploads will continue in the background. Check the Audio Files page for progress.</li>
                  </ul>
                </div>
              )}
            </>
          )}
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
                ? 'Starting Upload...' 
                : `Start Upload (${uploadableFiles.length} Files)`
              }
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 