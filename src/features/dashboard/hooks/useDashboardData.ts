import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectMetadata } from '../../../shared/hooks/query/dashboard';
import { useBibleVersions } from '../../../shared/stores/project';
import { supabase } from '../../../shared/services/supabase';

interface ProgressStats {
  audioProgress: {
    chaptersWithAudio: number;
    totalChapters: number;
    percentage: number;
  };
  textProgress: {
    chaptersWithText: number;
    totalChapters: number;
    percentage: number;
  };
}

interface ActivityItem extends Record<string, unknown> {
  id: string;
  type: 'audio' | 'text';
  reference: string;
  filename: string;
  status: string;
  date: string;
}

interface DashboardDataProps {
  projectId: string | null;
}

export function useDashboardData({ projectId }: DashboardDataProps) {
  const [selectedBibleVersion, setSelectedBibleVersion] = useState<string>('');

  // Data queries
  const { data: projectMetadata, isLoading: metadataLoading } = useProjectMetadata(projectId);
  // Get basic bible structure data
  const bibleVersions = useBibleVersions(); // This is now an array directly
  
  // Bible progress calculation (efficient counting instead of fetching all records)
  const { data: progressStats, isLoading: progressLoading } = useQuery<ProgressStats>({
    queryKey: ['bible-progress-chapters', projectId, selectedBibleVersion],
    queryFn: async () => {
      if (!projectId || !selectedBibleVersion) {
        return {
          audioProgress: { chaptersWithAudio: 0, totalChapters: 0, percentage: 0 },
          textProgress: { chaptersWithText: 0, totalChapters: 0, percentage: 0 }
        };
      }

      console.log('Calculating chapter-based progress for project:', projectId, 'version:', selectedBibleVersion);

      // Get total chapters count for this bible version (much more efficient)
      const { count: totalChapters, error: chaptersCountError } = await supabase
        .from('chapters')
        .select('*, books!inner(*)', { count: 'exact', head: true })
        .eq('books.bible_version_id', selectedBibleVersion);

      if (chaptersCountError) {
        console.error('Error getting chapters count:', chaptersCountError);
        throw chaptersCountError;
      }

      if (!totalChapters || totalChapters === 0) {
        return {
          audioProgress: { chaptersWithAudio: 0, totalChapters: 0, percentage: 0 },
          textProgress: { chaptersWithText: 0, totalChapters: 0, percentage: 0 }
        };
      }

      // Get audio versions for this project
      const { data: audioVersions } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      const audioVersionIds = audioVersions?.map(v => v.id) || [];

      // Count distinct chapters that have audio files (much more efficient)
      const { data: audioFiles, error: audioFilesError } = await supabase
        .from('media_files')
        .select('chapter_id')
        .in('audio_version_id', audioVersionIds)
        .not('chapter_id', 'is', null);

      if (audioFilesError) {
        console.error('Error getting audio files:', audioFilesError);
      }

      // Count unique chapters with audio
      const audioChapterIds = new Set(audioFiles?.map(file => file.chapter_id) || []);

      // Get chapters that have verse texts
      const { data: project } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single();

      let uniqueTextChapters = new Set<string>();
      
      if (project?.target_language_entity_id) {
        // Count distinct chapters that have text (much more efficient)
        const { data: verseTexts, error: textChaptersError } = await supabase
          .from('verse_texts')
          .select(`
            verse:verses!verse_id(chapter_id),
            text_versions!inner(language_entity_id)
          `)
          .eq('text_versions.language_entity_id', project.target_language_entity_id);

        if (textChaptersError) {
          console.error('Error getting chapters with text:', textChaptersError);
        } else {
          uniqueTextChapters = new Set(
            verseTexts?.map(t => t.verse?.chapter_id).filter(Boolean) || []
          );
        }
      }

      // Use chapter-level progress
      const audioProgress = {
        chaptersWithAudio: audioChapterIds.size,
        totalChapters: totalChapters,
        percentage: totalChapters > 0 ? (audioChapterIds.size / totalChapters) * 100 : 0
      };

      const textProgress = {
        chaptersWithText: uniqueTextChapters.size,
        totalChapters: totalChapters,
        percentage: totalChapters > 0 ? (uniqueTextChapters.size / totalChapters) * 100 : 0
      };

      return { audioProgress, textProgress };
    },
    enabled: !!projectId && !!selectedBibleVersion,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Recent activity data
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity-with-verse-info', projectId, 5],
    queryFn: async () => {
      if (!projectId) return { mediaFiles: [], textUpdates: [] };

      // First get audio versions for this project
      const { data: audioVersions } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      const audioVersionIds = audioVersions?.map(v => v.id) || [];

      let mediaFiles: Array<{
        id: string;
        remote_path: string | null;
        check_status: string | null;
        upload_status: string | null;
        created_at: string | null;
        updated_at: string | null;
        chapter_id: string | null;
        start_verse_id: string | null;
        end_verse_id: string | null;
        duration_seconds: number | null;
        filename?: string;
        verse_reference?: string;
        book_name?: string;
        chapter_number?: number;
        start_verse_number?: number;
        end_verse_number?: number;
      }> = [];

      if (audioVersionIds.length > 0) {
        const { data: mediaFilesData, error: mediaError } = await supabase
          .from('media_files')
          .select(`
            id,
            remote_path,
            check_status,
            upload_status,
            created_at,
            updated_at,
            chapter_id,
            start_verse_id,
            end_verse_id,
            duration_seconds,
            chapters!chapter_id(
              chapter_number,
              books!book_id(
                name,
                global_order
              )
            ),
            start_verses:verses!start_verse_id(
              verse_number
            ),
            end_verses:verses!end_verse_id(
              verse_number
            )
          `)
          .in('audio_version_id', audioVersionIds)
          .eq('is_bible_audio', true)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (mediaError) {
          console.error('Media files error:', mediaError);
        } else {
          // Transform the data to include verse reference
          mediaFiles = (mediaFilesData || []).map(file => {
            const filename = file.remote_path ? 
              file.remote_path.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Audio File' : 
              'Audio File';

            let verse_reference = 'Unknown Reference';
            
            if (file.chapters && file.start_verses && file.end_verses) {
              const chapter = Array.isArray(file.chapters) ? file.chapters[0] : file.chapters;
              const book = chapter?.books;
              const startVerse = Array.isArray(file.start_verses) ? file.start_verses[0] : file.start_verses;
              const endVerse = Array.isArray(file.end_verses) ? file.end_verses[0] : file.end_verses;
              
              if (book && chapter && startVerse && endVerse) {
                const bookName = book.name;
                const chapterNum = chapter.chapter_number;
                const startVerseNum = startVerse.verse_number;
                const endVerseNum = endVerse.verse_number;
                
                if (startVerseNum === endVerseNum) {
                  verse_reference = `${bookName} ${chapterNum}:${startVerseNum}`;
                } else {
                  verse_reference = `${bookName} ${chapterNum}:${startVerseNum}-${endVerseNum}`;
                }
              }
            }

            return {
              ...file,
              filename,
              verse_reference,
              book_name: file.chapters?.books?.name,
              chapter_number: file.chapters?.chapter_number,
              start_verse_number: file.start_verses?.verse_number,
              end_verse_number: file.end_verses?.verse_number
            };
          });
        }
      }

      return {
        mediaFiles,
        textUpdates: []
      };
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Transform recent activity data
  const recentActivityData: ActivityItem[] = useMemo(() => {
    if (!recentActivity) return [];

    interface MediaFileSimple {
      id: string;
      remote_path: string | null;
      check_status: string | null;
      upload_status: string | null;
      created_at: string | null;
      updated_at: string | null;
      filename?: string;
      verse_reference?: string;
    }

    const audioFiles = (recentActivity.mediaFiles || []).map((file): ActivityItem => {
      const mediaFile = file as MediaFileSimple;
      return {
        id: `audio-${mediaFile.id}`,
        type: 'audio' as const,
        reference: mediaFile.verse_reference || 'Unknown Reference',
        filename: mediaFile.filename || 'Audio File',
        status: mediaFile.upload_status || 'pending',
        date: mediaFile.updated_at || mediaFile.created_at || new Date().toISOString()
      };
    });

    return [...audioFiles]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [recentActivity]);

  // Set default bible version
  useEffect(() => {
    if (bibleVersions && bibleVersions.length > 0 && !selectedBibleVersion) {
      setSelectedBibleVersion(bibleVersions[0].id);
    }
  }, [bibleVersions, selectedBibleVersion]);

  return {
    // State
    selectedBibleVersion,
    setSelectedBibleVersion,
    
    // Data
    projectMetadata,
    bibleVersions: bibleVersions || [],
    progressStats,
    recentActivityData,
    
    // Loading states
    metadataLoading,
    progressLoading,
    activityLoading,
    
    // Computed properties
    isLoading: metadataLoading || progressLoading || activityLoading,
  };
} 