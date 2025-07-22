import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectMetadata } from '../../../shared/hooks/query/dashboard';
import { useBibleVersions } from '../../../shared/hooks/query/bible-versions';
import { supabase } from '../../../shared/services/supabase';

interface ProgressStats {
  audioProgress: {
    versesWithAudio: number;
    totalVerses: number;
    percentage: number;
  };
  textProgress: {
    versesWithText: number;
    totalVerses: number;
    percentage: number;
  };
}

interface ActivityItem extends Record<string, unknown> {
  id: string;
  type: 'audio' | 'text';
  reference: string;
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
  const { data: bibleVersions } = useBibleVersions();
  
  // Bible progress calculation (chapter-based for performance)
  const { data: progressStats, isLoading: progressLoading } = useQuery<ProgressStats>({
    queryKey: ['bible-progress-chapters', projectId, selectedBibleVersion],
    queryFn: async () => {
      if (!projectId || !selectedBibleVersion) {
        return {
          audioProgress: { versesWithAudio: 0, totalVerses: 0, percentage: 0 },
          textProgress: { versesWithText: 0, totalVerses: 0, percentage: 0 }
        };
      }

      console.log('Calculating chapter-based progress for project:', projectId, 'version:', selectedBibleVersion);

      // Get books for this bible version
      const { data: booksInVersion, error: booksError } = await supabase
        .from('books')
        .select('id')
        .eq('bible_version_id', selectedBibleVersion);

      if (booksError) {
        console.error('Error getting books:', booksError);
        throw booksError;
      }

      if (!booksInVersion || booksInVersion.length === 0) {
        return {
          audioProgress: { versesWithAudio: 0, totalVerses: 0, percentage: 0 },
          textProgress: { versesWithText: 0, totalVerses: 0, percentage: 0 }
        };
      }

      const bookIds = booksInVersion.map(book => book.id);

      // Get total chapters for these books
      const { count: totalChapters, error: chaptersCountError } = await supabase
        .from('chapters')
        .select('id', { count: 'exact', head: true })
        .in('book_id', bookIds);

      if (chaptersCountError) {
        console.error('Error counting chapters:', chaptersCountError);
        throw chaptersCountError;
      }

      // Get chapters that have audio files
      const { data: audioFiles, error: audioFilesError } = await supabase
        .from('media_files')
        .select('start_verse_id, end_verse_id')
        .eq('project_id', projectId)
        .not('start_verse_id', 'is', null);

      if (audioFilesError) {
        console.error('Error getting audio files:', audioFilesError);
      }

      // Get chapters for audio files through verses
      const audioChapterIds = new Set<string>();
      if (audioFiles && audioFiles.length > 0) {
        const allVerseIds = new Set<string>();
        audioFiles.forEach(file => {
          if (file.start_verse_id) allVerseIds.add(file.start_verse_id);
          if (file.end_verse_id) allVerseIds.add(file.end_verse_id);
        });

        if (allVerseIds.size > 0) {
          const { data: versesWithChapters } = await supabase
            .from('verses')
            .select(`
              chapter_id,
              chapters!inner(book_id)
            `)
            .in('id', Array.from(allVerseIds))
            .in('chapters.book_id', bookIds);

          versesWithChapters?.forEach(v => {
            if (v.chapter_id) audioChapterIds.add(v.chapter_id);
          });
        }
      }

      // Get chapters that have verse texts
      const { data: project } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single();

      let uniqueTextChapters = new Set<string>();
      
      if (project?.target_language_entity_id) {
        const { data: chaptersWithText, error: textChaptersError } = await supabase
          .from('verse_texts')
          .select(`
            verses!inner(
              chapter_id,
              chapters!inner(book_id)
            ),
            text_versions!inner(language_entity_id)
          `)
          .eq('text_versions.language_entity_id', project.target_language_entity_id)
          .in('verses.chapters.book_id', bookIds);

        if (textChaptersError) {
          console.error('Error getting chapters with text:', textChaptersError);
        } else {
          uniqueTextChapters = new Set(
            chaptersWithText?.map(t => t.verses?.chapter_id).filter(Boolean) || []
          );
        }
      }

      const audioProgress = {
        versesWithAudio: audioChapterIds.size,
        totalVerses: totalChapters || 0,
        percentage: totalChapters && totalChapters > 0 ? (audioChapterIds.size / totalChapters) * 100 : 0
      };

      const textProgress = {
        versesWithText: uniqueTextChapters.size,
        totalVerses: totalChapters || 0,
        percentage: totalChapters && totalChapters > 0 ? (uniqueTextChapters.size / totalChapters) * 100 : 0
      };

      return { audioProgress, textProgress };
    },
    enabled: !!projectId && !!selectedBibleVersion,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Recent activity data
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity-custom', projectId, 10],
    queryFn: async () => {
      if (!projectId) return { mediaFiles: [], textUpdates: [] };

      const { data: mediaFiles, error: mediaError } = await supabase
        .from('media_files')
        .select(`
          id,
          remote_path,
          check_status,
          upload_status,
          created_at,
          updated_at,
          start_verse_id,
          end_verse_id
        `)
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (mediaError) {
        console.error('Media files error:', mediaError);
      }

      return {
        mediaFiles: mediaFiles || [],
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
      updated_at: string | null;
      created_at: string | null;
      start_verse_id: string | null;
      end_verse_id: string | null;
    }

    const audioFiles = (recentActivity.mediaFiles || []).map((file): ActivityItem => {
      const mediaFile = file as MediaFileSimple;
      return {
        id: `audio-${mediaFile.id}`,
        type: 'audio' as const,
        reference: mediaFile.remote_path ? 
          mediaFile.remote_path.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Audio File' : 
          'Audio File',
        status: mediaFile.check_status || 'pending',
        date: mediaFile.updated_at || mediaFile.created_at || new Date().toISOString()
      };
    });

    return [...audioFiles]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
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