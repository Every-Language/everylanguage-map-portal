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

      // Get all chapters for this bible version
      const { data: allChapters, error: chaptersError } = await supabase
        .from('chapters')
        .select(`
          id,
          books!inner(
            id,
            bible_version_id
          )
        `)
        .eq('books.bible_version_id', selectedBibleVersion);

      if (chaptersError) {
        console.error('Error getting chapters:', chaptersError);
        throw chaptersError;
      }

      if (!allChapters || allChapters.length === 0) {
        return {
          audioProgress: { versesWithAudio: 0, totalVerses: 0, percentage: 0 },
          textProgress: { versesWithText: 0, totalVerses: 0, percentage: 0 }
        };
      }

      const allChapterIds = allChapters.map(c => c.id);
      const totalChapters = allChapterIds.length;

      // First get audio versions for this project
      const { data: audioVersions } = await supabase
        .from('audio_versions')
        .select('id')
        .eq('project_id', projectId);

      const audioVersionIds = audioVersions?.map(v => v.id) || [];

      // OPTIMIZED: Get chapters that have audio files using direct chapter_id
      const { data: audioFiles, error: audioFilesError } = await supabase
        .from('media_files')
        .select('chapter_id')
        .in('audio_version_id', audioVersionIds)
        .in('chapter_id', allChapterIds)
        .not('chapter_id', 'is', null);

      if (audioFilesError) {
        console.error('Error getting audio files:', audioFilesError);
      }

      // OPTIMIZED: Count unique chapters with audio
      const audioChapterIds = new Set<string>();
      if (audioFiles && audioFiles.length > 0) {
        audioFiles.forEach(file => {
          if (file.chapter_id) {
            audioChapterIds.add(file.chapter_id);
          }
        });
      }

      // Get chapters that have verse texts
      const { data: project } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single();

      let uniqueTextChapters = new Set<string>();
      
      if (project?.target_language_entity_id) {
        // OPTIMIZED: Get chapters that have text using direct chapter relationship
        const { data: verseTexts, error: textChaptersError } = await supabase
          .from('verse_texts')
          .select(`
            verse:verses!verse_id(chapter_id),
            text_versions!inner(language_entity_id)
          `)
          .eq('text_versions.language_entity_id', project.target_language_entity_id)
          .in('verse.chapter_id', allChapterIds);

        if (textChaptersError) {
          console.error('Error getting chapters with text:', textChaptersError);
        } else {
          uniqueTextChapters = new Set(
            verseTexts?.map(t => t.verse?.chapter_id).filter(Boolean) || []
          );
        }
      }

      // SIMPLIFIED: Use chapter-level progress instead of verse-level
      const audioProgress = {
        versesWithAudio: audioChapterIds.size,
        totalVerses: totalChapters,
        percentage: totalChapters > 0 ? (audioChapterIds.size / totalChapters) * 100 : 0
      };

      const textProgress = {
        versesWithText: uniqueTextChapters.size,
        totalVerses: totalChapters,
        percentage: totalChapters > 0 ? (uniqueTextChapters.size / totalChapters) * 100 : 0
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
            chapter_id
          `)
          .in('audio_version_id', audioVersionIds)
          .order('updated_at', { ascending: false })
          .limit(10);

        if (mediaError) {
          console.error('Media files error:', mediaError);
        } else {
          mediaFiles = mediaFilesData || [];
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
      chapter_id: string | null;
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