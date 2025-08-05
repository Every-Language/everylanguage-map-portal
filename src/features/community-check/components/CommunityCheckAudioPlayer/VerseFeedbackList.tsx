import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { VerseWithFeedback } from './VerseWithFeedback';
import type { MediaFileWithVerseInfo } from '@/shared/hooks/query/media-files';
import type { VerseTimestamp } from '../../types';

interface VerseFeedbackListProps {
  file: MediaFileWithVerseInfo;
  currentVerse: VerseTimestamp | null;
  onJumpToVerse?: (timestamp: number) => void;
}

export function VerseFeedbackList({ file, currentVerse, onJumpToVerse }: VerseFeedbackListProps) {
  const currentVerseRef = useRef<HTMLDivElement>(null);

  // Fetch verse timestamps for the current media file
  const { data: verseTimestamps = [], isLoading } = useQuery({
    queryKey: ['media_files_verses', file.id],
    queryFn: async () => {
      if (!file.id) return [];
      
      const { data, error } = await supabase
        .from('media_files_verses')
        .select(`
          id,
          verse_id,
          start_time_seconds,
          duration_seconds,
          verses!verse_id(
            verse_number
          )
        `)
        .eq('media_file_id', file.id)
        .order('start_time_seconds', { ascending: true });

      if (error) {
        console.error('Error fetching verse timestamps:', error);
        return [];
      }

      return (data || []).map(verse => ({
        id: verse.id,
        verse_id: verse.verse_id,
        start_time_seconds: verse.start_time_seconds,
        duration_seconds: verse.duration_seconds,
        verse_number: (verse.verses as { verse_number: number })?.verse_number || 0,
      })) as VerseTimestamp[];
    },
    enabled: !!file.id,
  });

  // Auto-scroll to current verse
  useEffect(() => {
    if (currentVerse && currentVerseRef.current) {
      currentVerseRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentVerse]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (verseTimestamps.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No verse timestamps found for this file.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Verse timestamps are needed to provide feedback on individual verses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Verse Feedback ({verseTimestamps.length} verses)
        </h4>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {currentVerse ? `Currently: Verse ${currentVerse.verse_number}` : 'No verse selected'}
        </div>
      </div>
      
      {verseTimestamps.map((verse) => (
        <div
          key={verse.id}
          ref={currentVerse?.id === verse.id ? currentVerseRef : null}
        >
          <VerseWithFeedback
            verse={verse}
            mediaFileId={file.id}
            isCurrentVerse={currentVerse?.id === verse.id}
            onJumpToVerse={onJumpToVerse}
          />
        </div>
      ))}
    </div>
  );
} 