import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { AudioFileProcessor, type ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';
import { supabase } from '../../../shared/services/supabase';

export function useAudioFileProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { selectedProject } = useSelectedProject();
  const audioProcessor = useRef(new AudioFileProcessor()).current;

  // Get the default bible version for full chapter resolution
  const { data: defaultBibleVersionId } = useQuery({
    queryKey: ['default-bible-version-upload'],
    queryFn: async () => {
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
    enabled: !!selectedProject?.id,
  });

  // Handle file selection/drop
  const processFiles = useCallback(async (
    files: File[], 
    onFilesProcessed: (processedFiles: ProcessedAudioFile[]) => void
  ) => {
    setIsProcessing(true);
    
    try {
      const processedFiles = await audioProcessor.processFiles(files, defaultBibleVersionId || undefined);
      
      onFilesProcessed(processedFiles);
      
      if (processedFiles.some(f => !f.isValid)) {
        toast({
          title: 'Some files have issues',
          description: `${processedFiles.filter(f => !f.isValid).length} files could not be processed`,
          variant: 'warning'
        });
      } else {
        toast({
          title: 'Files added successfully',
          description: `${processedFiles.length} audio files ready for upload`,
          variant: 'success'
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: 'Error processing files',
        description: 'Some files could not be processed. Please try again.',
        variant: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [audioProcessor, defaultBibleVersionId, toast]);

  // Update processed file with new information
  const updateProcessedFile = useCallback((file: ProcessedAudioFile, updates: Partial<ProcessedAudioFile>) => {
    return audioProcessor.updateProcessedFile(file, updates);
  }, [audioProcessor]);

  return {
    isProcessing,
    processFiles,
    updateProcessedFile,
  };
} 