import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useB2AudioUpload } from '../hooks/useB2AudioUpload';
import { supabase } from '../../../shared/services/supabase';
import { useQuery } from '@tanstack/react-query';

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
  selectedAudioVersionId: string; // Automatically use the selected audio version from the audio files page
}

export function AudioUploadModal({ 
  open, 
  onOpenChange, 
  onUploadComplete,
  selectedAudioVersionId
}: AudioUploadModalProps) {
  
  const { selectedProject } = useSelectedProject();
  const [audioFiles, setAudioFiles] = useState<ProcessedAudioFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  
  // B2 upload functionality
  const {
    isUploading,
    handleUpload: handleB2Upload,
    uploadSummary,
  } = useB2AudioUpload();
  
  const { toast } = useToast();
  const audioProcessor = useRef(new AudioFileProcessor()).current;
  
  // Get the currently selected bible version from the audio files screen context
  // This should come from the table's currently selected bible version
  const { data: defaultBibleVersionId } = useQuery({
    queryKey: ['current-bible-version-for-upload'],
    queryFn: async () => {
      // Try to get the first available bible version as default
      const { data: bibleVersions, error } = await supabase
        .from('bible_versions')
        .select('id, name')
        .order('name')
        .limit(1);

      if (error) {
        console.error('Error fetching bible versions:', error);
        return null;
      }

      return bibleVersions?.[0]?.id || null;
    },
    enabled: !!selectedProject
  });

  // Handle file processing
  const handleFilesAdded = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    
    try {
      console.log('Processing files:', files.map(f => f.name));
      
      // Filter supported files
      const supportedFiles = files.filter(file => 
        SUPPORTED_AUDIO_TYPES.includes(file.type)
      );
      
      if (supportedFiles.length === 0) {
        toast({
          title: 'No supported files',
          description: 'Please select audio files (MP3, WAV, M4A, etc.)',
          variant: 'warning'
        });
        return;
      }
      
      if (supportedFiles.length !== files.length) {
        toast({
          title: 'Some files skipped',
          description: `${files.length - supportedFiles.length} unsupported files were skipped`,
          variant: 'warning'
        });
      }
      
      // Process each file
      const processedFiles = await Promise.all(
        supportedFiles.map(file => 
          audioProcessor.processFile(file, defaultBibleVersionId || undefined)
        )
      );
      
      // Add to existing files
      setAudioFiles(prev => [...prev, ...processedFiles]);
      
      toast({
        title: 'Files processed',
        description: `${processedFiles.length} files ready for upload`,
        variant: 'success'
      });
      
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: 'Processing failed',
        description: 'There was an error processing your files',
        variant: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [audioProcessor, defaultBibleVersionId, toast]);

  // Update file with book/chapter/verse selections
  const updateFileSelection = useCallback((fileId: string, updates: Partial<ProcessedAudioFile>) => {
    setAudioFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, ...updates }
          : file
      )
    );
  }, []);

  // Remove file from list
  const removeFile = useCallback((fileId: string) => {
    setAudioFiles(prev => prev.filter(f => f.id !== fileId));
    
    if (currentlyPlayingId === fileId) {
      setCurrentlyPlayingId(null);
    }
  }, [currentlyPlayingId]);

  // Handle upload using B2 direct upload
  const handleUpload = useCallback(async () => {
    if (!selectedProject) {
      toast({
        title: 'No project selected',
        description: 'Please select a project before uploading files',
        variant: 'error'
      });
      return;
    }

    if (!selectedAudioVersionId) {
      toast({
        title: 'Audio version required',
        description: 'Please select an audio version before uploading',
        variant: 'error'
      });
      return;
    }

    const validFiles = audioFiles.filter(f => 
      f.isValid && 
      f.selectedBookId && 
      f.selectedChapterId && 
      f.selectedStartVerseId && 
      f.selectedEndVerseId
    );

    if (validFiles.length === 0) {
      toast({
        title: 'No valid files to upload',
        description: 'Please ensure all files have book, chapter, and verse selections',
        variant: 'warning'
      });
      return;
    }

    try {
      console.log('🚀 Starting upload for', validFiles.length, 'files');
      
      // Start B2 upload
      await handleB2Upload(validFiles, selectedAudioVersionId);
      
      // Close modal on successful upload initiation
      onOpenChange(false);
      
      // Call completion callback if provided
      onUploadComplete?.();
      
    } catch (error) {
      console.error('Upload failed:', error);
      // Error handling is done in the hook
    }
  }, [selectedProject, selectedAudioVersionId, audioFiles, handleB2Upload, onOpenChange, onUploadComplete, toast]);

  // Get files ready for upload count
  const filesReadyForUpload = audioFiles.filter(f => 
    f.isValid && 
    f.selectedBookId && 
    f.selectedChapterId && 
    f.selectedStartVerseId && 
    f.selectedEndVerseId
  ).length;

  // Don't allow modal to close while uploading
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && isUploading) {
      toast({
        title: 'Upload in progress',
        description: 'Please wait for the upload to complete before closing',
        variant: 'warning'
      });
      return;
    }
    onOpenChange(newOpen);
  }, [isUploading, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Audio Files</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-1">
          {/* File Upload Area */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Audio Files</h3>
            
            <FileUpload
              multiple
              accept={SUPPORTED_AUDIO_TYPES.join(',')}
              onFilesChange={handleFilesAdded}
              disabled={isProcessing || isUploading}
              allowedTypes={SUPPORTED_AUDIO_TYPES}
              uploadText={isProcessing ? 'Processing files...' : 'Drop audio files here or click to browse'}
              className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              maxFiles={50}
              maxSize={500 * 1024 * 1024} // 500MB
            />

            {/* Files List */}
            {audioFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Files ({audioFiles.length})
                  </h4>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {filesReadyForUpload} ready for upload
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAudioFiles([])}
                      disabled={isUploading}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {audioFiles.map((file) => (
                                         <AudioFileRow
                       key={file.id}
                       file={file}
                       projectId={selectedProject?.id || ''}
                       isPlaying={currentlyPlayingId === file.id}
                       onPlay={() => setCurrentlyPlayingId(file.id)}
                       onPause={() => setCurrentlyPlayingId(null)}
                       onDelete={() => removeFile(file.id)}
                       onBookChange={(bookId) => updateFileSelection(file.id, { selectedBookId: bookId })}
                       onChapterChange={(chapterId) => updateFileSelection(file.id, { selectedChapterId: chapterId })}
                       onStartVerseChange={(verseId) => updateFileSelection(file.id, { selectedStartVerseId: verseId })}
                       onEndVerseChange={(verseId) => updateFileSelection(file.id, { selectedEndVerseId: verseId })}
                     />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {uploadSummary && (
                <span>
                  Upload: {uploadSummary.completed}/{uploadSummary.total} completed
                  {uploadSummary.failed > 0 && `, ${uploadSummary.failed} failed`}
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <DialogClose asChild>
                <Button 
                  variant="outline"
                  disabled={isUploading}
                >
                  {isUploading ? 'Upload in Progress...' : 'Cancel'}
                </Button>
              </DialogClose>
              <Button
                onClick={handleUpload}
                disabled={
                  isUploading || 
                  isProcessing || 
                  filesReadyForUpload === 0 || 
                  !selectedAudioVersionId
                }
                className="flex items-center space-x-2"
              >
                {isUploading && <LoadingSpinner size="sm" />}
                <span>
                  {isUploading 
                    ? 'Uploading...' 
                    : `Upload ${filesReadyForUpload} Files`
                  }
                </span>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 