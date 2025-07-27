import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../shared/services/supabase';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import type { MediaFileWithVerseInfo } from '../../../shared/hooks/query/media-files';
import type { TempVerse } from '../components/AudioFileManager/VerseMarkingModal';

// Type for existing verse markings from DB
export interface MediaFileVerse {
  id: string;
  media_file_id: string;
  verse_id: string;
  start_time_seconds: number;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export function useVerseMarking() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMediaFile, setCurrentMediaFile] = useState<MediaFileWithVerseInfo | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch existing verse markings for a media file
  const { data: existingVerses, isLoading: loadingVerses } = useQuery({
    queryKey: ['media_files_verses', currentMediaFile?.id],
    queryFn: async () => {
      if (!currentMediaFile?.id) return [];
      
      const { data, error } = await supabase
        .from('media_files_verses')
        .select(`
          id,
          verse_id,
          start_time_seconds,
          duration_seconds,
          created_at,
          updated_at,
          verses!verse_id(
            verse_number
          )
        `)
        .eq('media_file_id', currentMediaFile.id)
        .order('start_time_seconds', { ascending: true });

      if (error) {
        console.error('Error fetching verse markings:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!currentMediaFile?.id && isOpen,
  });

  // Calculate duration between verses
  const calculateVerseDurations = (verses: TempVerse[], totalAudioDuration: number): Array<{ verse: TempVerse; duration: number }> => {
    if (verses.length === 0) return [];

    return verses.map((verse, index) => {
      let duration: number;
      
      if (index === verses.length - 1) {
        // Last verse: duration from verse start to end of audio
        duration = parseFloat(Math.max(0.1, totalAudioDuration - verse.timestamp).toFixed(2));
      } else {
        // Other verses: duration from verse start to next verse start
        const nextVerse = verses[index + 1];
        duration = parseFloat(Math.max(0.1, nextVerse.timestamp - verse.timestamp).toFixed(2));
      }
      
      return { verse, duration };
    });
  };

  // Mutation to save verse markings
  const saveVersesMutation = useMutation({
    mutationFn: async ({ 
      mediaFileId, 
      verses,
      totalAudioDuration 
    }: { 
      mediaFileId: string; 
      verses: TempVerse[];
      totalAudioDuration: number;
    }) => {
      console.log('Saving verses for media file:', mediaFileId, verses);

      // Step 1: Always delete all existing verse markings for this media file first
      const { error: deleteError } = await supabase
        .from('media_files_verses')
        .delete()
        .eq('media_file_id', mediaFileId);

      if (deleteError) {
        console.error('Error deleting existing verses:', deleteError);
        throw deleteError;
      }

      // Step 2: If there are no verses to save, we're done
      if (verses.length === 0) {
        console.log('No verses to save, deletion complete');
        return [];
      }

      // Step 3: Get the media file info to determine the verse range
      const { data: mediaFileData, error: mediaFileError } = await supabase
        .from('media_files')
        .select(`
          chapter_id,
          start_verse_id,
          end_verse_id
        `)
        .eq('id', mediaFileId)
        .single();

      if (mediaFileError) {
        console.error('Error fetching media file info:', mediaFileError);
        throw mediaFileError;
      }

      if (!mediaFileData.chapter_id || !mediaFileData.start_verse_id || !mediaFileData.end_verse_id) {
        throw new Error('Media file is missing required verse or chapter information');
      }

      // Step 4: Get start and end verse numbers to determine the range
      const { data: startVerse, error: startVerseError } = await supabase
        .from('verses')
        .select('verse_number')
        .eq('id', mediaFileData.start_verse_id)
        .single();
      
      const { data: endVerse, error: endVerseError } = await supabase
        .from('verses')
        .select('verse_number')
        .eq('id', mediaFileData.end_verse_id)
        .single();

      if (startVerseError || endVerseError || !startVerse || !endVerse) {
        console.error('Error fetching start/end verse info:', { startVerseError, endVerseError });
        throw new Error('Could not find start or end verse information');
      }

      // Step 5: Get all verses in the media file's range
      const { data: rangeVerses, error: rangeError } = await supabase
        .from('verses')
        .select('id, verse_number')
        .eq('chapter_id', mediaFileData.chapter_id)
        .gte('verse_number', startVerse.verse_number)
        .lte('verse_number', endVerse.verse_number)
        .order('verse_number', { ascending: true });

      if (rangeError || !rangeVerses) {
        console.error('Error fetching chapter verses in range:', rangeError);
        throw new Error('Could not fetch verses in the specified range');
      }

      console.log(`Found ${rangeVerses.length} verses in range ${startVerse.verse_number}-${endVerse.verse_number}`);

      // Step 6: Validate that we have enough verses for the markings
      if (verses.length > rangeVerses.length) {
        throw new Error(`Cannot mark ${verses.length} verses. This audio file only covers ${rangeVerses.length} verse(s) (${startVerse.verse_number}-${endVerse.verse_number})`);
      }

      // Step 7: Calculate durations and map temporary verses to actual verse_ids
      const versesWithDurations = calculateVerseDurations(verses, totalAudioDuration);
      
      const verseMarkings = versesWithDurations.map((item, index) => {
        const targetVerse = rangeVerses[index];
        
        if (!targetVerse) {
          throw new Error(`Not enough verses in range for marking ${index + 1}. Available: ${rangeVerses.length}, Needed: ${verses.length}`);
        }

        console.log(`Mapping temp verse ${index + 1} (${item.verse.timestamp}s) to verse ${targetVerse.verse_number} (${targetVerse.id})`);

        return {
          media_file_id: mediaFileId,
          verse_id: targetVerse.id,
          start_time_seconds: parseFloat(item.verse.timestamp.toFixed(2)),
          duration_seconds: parseFloat(item.duration.toFixed(2)),
        };
      });

      // Step 8: Insert new verse markings
      const { data, error: insertError } = await supabase
        .from('media_files_verses')
        .insert(verseMarkings)
        .select();

      if (insertError) {
        console.error('Error inserting verse markings:', insertError);
        throw insertError;
      }

      console.log('Successfully saved verse markings:', data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Verse markings saved',
        description: 'Successfully updated verse timestamps',
        variant: 'success'
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['media_files_verses'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_with_verse_info'] });
      queryClient.invalidateQueries({ queryKey: ['media_files_verses_batch'] });
      
      // Close the modal
      closeModal();
    },
    onError: (error: Error) => {
      console.error('Error saving verse markings:', error);
      toast({
        title: 'Failed to save verse markings',
        description: error.message,
        variant: 'error'
      });
    },
  });

  // Open verse marking modal
  const openModal = useCallback(async (file: MediaFileWithVerseInfo) => {
    console.log('Opening verse marking modal for file:', file);
    
    if (!file.remote_path) {
      console.error('No remote_path found for file:', file);
      toast({
        title: 'Error',
        description: 'No audio file available for verse marking',
        variant: 'error'
      });
      return;
    }

    setIsLoadingAudio(true);
    try {
      console.log('Getting download URL for:', file.remote_path);
      
      // Get presigned URL for the audio file
      const downloadService = await import('../../../shared/services/downloadService');
      const service = new downloadService.DownloadService();
      const result = await service.getDownloadUrls([file.remote_path]);
      
      console.log('Download service result:', result);
      
      if (result.success && result.urls[file.remote_path]) {
        const audioUrl = result.urls[file.remote_path];
        console.log('Got audio URL:', audioUrl);
        
        setCurrentMediaFile(file);
        setAudioUrl(audioUrl);
        setIsOpen(true);
      } else {
        console.error('Failed to get download URL:', result);
        toast({
          title: 'Error',
          description: 'Failed to get audio URL for verse marking',
          variant: 'error'
        });
      }
    } catch (error) {
      console.error('Error opening verse marking modal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open verse marking modal',
        variant: 'error'
      });
    } finally {
      setIsLoadingAudio(false);
    }
  }, [toast]);

  // Close modal
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setCurrentMediaFile(null);
    setAudioUrl(null);
    setIsLoadingAudio(false);
  }, []);

  // Save verses function
  const saveVerses = useCallback(async (verses: TempVerse[], totalAudioDuration: number) => {
    if (!currentMediaFile) {
      throw new Error('No media file selected');
    }

    await saveVersesMutation.mutateAsync({
      mediaFileId: currentMediaFile.id,
      verses,
      totalAudioDuration
    });
  }, [currentMediaFile, saveVersesMutation]);

  return {
    // Modal state
    isOpen,
    currentMediaFile,
    audioUrl,
    
    // Data - include verse numbers for display
    existingVerses: existingVerses?.map(v => ({
      verse_id: v.verse_id,
      verse_timestamp: v.start_time_seconds,
      verse_number: (v.verses as { verse_number: number })?.verse_number
    })) || [],
    
    // Loading states
    isLoading: loadingVerses,
    isLoadingAudio,
    isSaving: saveVersesMutation.isPending,
    
    // Actions
    openModal,
    closeModal,
    saveVerses,
  };
}

export type UseVerseMarkingReturn = ReturnType<typeof useVerseMarking>; 