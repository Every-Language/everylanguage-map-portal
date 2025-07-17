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
  LoadingSpinner
} from '../../../shared/design-system/components';
import { AudioFileRow } from './AudioFileRow';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { AudioFileProcessor, type ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';
import { UploadService } from '../../../shared/services/uploadService';
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
  const [audioFiles, setAudioFiles] = useState<ProcessedAudioFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const audioProcessor = useRef(new AudioFileProcessor()).current;
  const uploadService = useRef(new UploadService()).current;

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

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedProject) return;

    const validFiles = audioFiles.filter(file => uploadService.isFileValidForUpload(file));

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
      let successCount = 0;
      
      for (const file of validFiles) {
        // Update file status
        updateFile(file.id, { uploadStatus: 'uploading', uploadProgress: 0 });

        try {
          await uploadService.uploadAudioFile({
            file,
            projectId: selectedProject.id,
            languageEntityId: selectedProject.source_language_entity_id, // TODO: verify which language entity ID to use
            chapterId: file.selectedChapterId!,
            startVerseId: file.selectedStartVerseId!,
            endVerseId: file.selectedEndVerseId!,
            durationSeconds: file.duration,
            // No verse timings since we're not extracting them anymore
            verseTimings: undefined,
            onProgress: (progress) => {
              updateFile(file.id, { uploadProgress: progress });
            }
          });

          updateFile(file.id, { uploadStatus: 'success', uploadProgress: 100 });
          successCount++;
        } catch (error) {
          console.error('Upload failed for file:', file.name, error);
          updateFile(file.id, { 
            uploadStatus: 'error', 
            uploadError: error instanceof Error ? error.message : 'Upload failed'
          });
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Upload completed',
          description: `Successfully uploaded ${successCount} of ${validFiles.length} files`,
          variant: 'success'
        });

        onUploadComplete?.();
        
        // Only close if all uploads were successful
        if (successCount === validFiles.length) {
          handleClose();
        }
      } else {
        toast({
          title: 'Upload failed',
          description: 'No files were uploaded successfully. Please check the errors and try again.',
          variant: 'error'
        });
      }
    } catch (error) {
      console.error('Upload batch failed:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your files',
        variant: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedProject, audioFiles, updateFile, uploadService, toast, onUploadComplete]);

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

  const hasFiles = audioFiles.length > 0;
  const validFiles = audioFiles.filter(f => f.isValid);
  const uploadableFiles = validFiles.filter(f => uploadService.isFileValidForUpload(f));
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

          {/* File Upload Area */}
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

          {/* Instructions */}
          <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Instructions:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Filename Format:</strong> Please name your files as: <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-900 dark:text-neutral-100">Language_BookName_ChapterXXX_VXXX_XXX.mp3</code></li>
              <li><strong>Example:</strong> <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-900 dark:text-neutral-100">Bajhangi_2 Kings_Chapter001_V001_018.mp3</code> (2 Kings chapter 1, verses 1-18)</li>
              <li><strong>Example:</strong> <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-neutral-900 dark:text-neutral-100">Bajhangi_Psalms_Chapter089_V027_052.mp3</code> (Psalms chapter 89, verses 27-52)</li>
              <li>Files are automatically processed to detect book, chapter, and verses from filenames</li>
              <li>Verse timestamps are no longer extracted (simplified for performance)</li>
              <li>Select book, chapter, and verse range for each file before uploading</li>
              <li>Only one audio file can play at a time</li>
              <li>Maximum file size: 500MB per file</li>
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
                : `Upload ${uploadableFiles.length} Files`
              }
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 