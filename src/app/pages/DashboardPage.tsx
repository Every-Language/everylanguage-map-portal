import React, { useState } from 'react';
import { useAuth } from '../../features/auth';
import { useSelectedProject } from '../../features/dashboard';
import { 
  useProjectMetadata 
} from '../../shared/hooks/query/dashboard';
import { useBibleVersions } from '../../shared/hooks/query/bible-versions';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Select,
  SelectItem,
  Progress,
  LoadingSpinner,
  DataTable
} from '../../shared/design-system';
import { supabase } from '../../shared/services/supabase';
import { useQuery } from '@tanstack/react-query';

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

// Hook to calculate progress for a specific bible version - CHAPTER-BASED (much faster!)
function useBibleProgress(projectId: string | null, bibleVersionId: string | null) {
  return useQuery<ProgressStats>({
    queryKey: ['bible-progress-chapters', projectId, bibleVersionId],
    queryFn: async () => {
      if (!projectId || !bibleVersionId) {
        return {
          audioProgress: { versesWithAudio: 0, totalVerses: 0, percentage: 0 },
          textProgress: { versesWithText: 0, totalVerses: 0, percentage: 0 }
        };
      }

      console.log('Calculating chapter-based progress for project:', projectId, 'version:', bibleVersionId);

      // First get books for this bible version
      const { data: booksInVersion, error: booksError } = await supabase
        .from('books')
        .select('id')
        .eq('bible_version_id', bibleVersionId);

      if (booksError) {
        console.error('Error getting books:', booksError);
        throw booksError;
      }

      if (!booksInVersion || booksInVersion.length === 0) {
        console.log('No books found for bible version:', bibleVersionId);
        return {
          audioProgress: { versesWithAudio: 0, totalVerses: 0, percentage: 0 },
          textProgress: { versesWithText: 0, totalVerses: 0, percentage: 0 }
        };
      }

      const bookIds = booksInVersion.map(book => book.id);
      console.log('Found books:', bookIds.length);

      // Now get total chapters for these books
      const { count: totalChapters, error: chaptersCountError } = await supabase
        .from('chapters')
        .select('id', { count: 'exact', head: true })
        .in('book_id', bookIds);

      if (chaptersCountError) {
        console.error('Error counting chapters:', chaptersCountError);
        throw chaptersCountError;
      }

      console.log('Total chapters in bible version:', totalChapters);

      // Get chapters that have audio files (through verse relationships)
      const { data: audioFiles, error: audioFilesError } = await supabase
        .from('media_files')
        .select(`
          start_verse_id,
          end_verse_id
        `)
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

      console.log('Unique chapters with audio:', audioChapterIds.size);

      // Get chapters that have verse texts
      const { data: project } = await supabase
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single();

      let uniqueTextChapters = new Set<string>();
      
      if (project?.target_language_entity_id) {
        // Get chapters that have verse texts for this language
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
          console.log('Unique chapters with text:', uniqueTextChapters.size);
        }
      }

      const audioProgress = {
        versesWithAudio: audioChapterIds.size, // Now represents chapters, not verses
        totalVerses: totalChapters || 0, // Now represents total chapters
        percentage: totalChapters && totalChapters > 0 ? (audioChapterIds.size / totalChapters) * 100 : 0
      };

      const textProgress = {
        versesWithText: uniqueTextChapters.size, // Now represents chapters, not verses
        totalVerses: totalChapters || 0, // Now represents total chapters
        percentage: totalChapters && totalChapters > 0 ? (uniqueTextChapters.size / totalChapters) * 100 : 0
      };

      console.log('Progress calculated:', { audioProgress, textProgress });

      return { audioProgress, textProgress };
    },
    enabled: !!projectId && !!bibleVersionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for recent activity with better debugging
function useRecentActivityCustom(projectId: string | null, limit: number = 10) {
  return useQuery({
    queryKey: ['recent-activity-custom', projectId, limit],
    queryFn: async () => {
      if (!projectId) return { mediaFiles: [], textUpdates: [] };

      console.log('Fetching recent activity for project:', projectId);

      // Get recent media files with basic info only - avoid joins for now
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
        .limit(limit);

      if (mediaError) {
        console.error('Media files error:', mediaError);
      } else {
        console.log('Media files found:', mediaFiles?.length || 0);
      }

      // Simple return for now - no text updates until we debug media files
      return {
        mediaFiles: mediaFiles || [],
        textUpdates: []
      };
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export const DashboardPage: React.FC = React.memo(() => {
  const { user, dbUser } = useAuth();
  const { selectedProject } = useSelectedProject();
  const [selectedBibleVersion, setSelectedBibleVersion] = useState<string>('');

  // Data queries - using custom hook for better debugging
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivityCustom(selectedProject?.id || null, 10);
  const { data: projectMetadata, isLoading: metadataLoading } = useProjectMetadata(selectedProject?.id || null);
  const { data: bibleVersions } = useBibleVersions();
  const { data: progressStats, isLoading: progressLoading } = useBibleProgress(
    selectedProject?.id || null, 
    selectedBibleVersion || null
  );

  // Set default bible version
  React.useEffect(() => {
    if (bibleVersions && bibleVersions.length > 0 && !selectedBibleVersion) {
      setSelectedBibleVersion(bibleVersions[0].id);
    }
  }, [bibleVersions, selectedBibleVersion]);

  // Transform recent activity data
  const recentActivityData: ActivityItem[] = React.useMemo(() => {
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

    // No text updates for now since we simplified the query
    const textUpdates: ActivityItem[] = [];

    return [...audioFiles, ...textUpdates]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [recentActivity]);

  // Prepare recent activity data for table
  const recentActivityColumns = [
    {
      key: 'type',
      header: 'Type',
      render: (_value: unknown, item: ActivityItem) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          item.type === 'audio' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        }`}>
          {item.type === 'audio' ? 'Audio File' : 'Bible Text'}
        </span>
      )
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (_value: unknown, item: ActivityItem) => (
        <div className="font-medium text-neutral-900 dark:text-neutral-100">
          {item.reference}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (_value: unknown, item: ActivityItem) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          item.status === 'completed' || item.status === 'approved'
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            : item.status === 'pending'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        }`}>
          {item.status}
        </span>
      )
    },
    {
      key: 'date',
      header: 'Date',
      render: (_value: unknown, item: ActivityItem) => (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {new Date(item.date).toLocaleDateString()}
        </div>
      )
    }
  ];

  if (!selectedProject) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto mt-16 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            No Project Selected
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Please select a project from the sidebar to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Welcome back, {dbUser?.first_name || user?.email?.split('@')[0]}!
        </p>
        <p className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mt-2">
          {selectedProject.name}
        </p>
      </div>

      {/* Bible Version Selector */}
      <div className="w-full max-w-xs mb-6">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Bible Version
        </label>
        <Select 
          value={selectedBibleVersion} 
          onValueChange={setSelectedBibleVersion}
          placeholder="Select Bible version"
        >
          {bibleVersions?.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              {version.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Progress Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audio Bible Progress */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Audio Bible Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {Math.round(progressStats?.audioProgress.percentage || 0)}%
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      {progressStats?.audioProgress.versesWithAudio || 0} of {progressStats?.audioProgress.totalVerses || 0} chapters
                    </div>
                  </div>
                  <div className="w-20 h-20 relative">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="100, 100"
                        className="text-blue-200 dark:text-blue-800"
                      />
                      <path
                        d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${progressStats?.audioProgress.percentage || 0}, 100`}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                        Audio
                      </span>
                    </div>
                  </div>
                </div>
                <Progress 
                  value={progressStats?.audioProgress.percentage || 0} 
                  className="w-full h-2 bg-blue-200 dark:bg-blue-800"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Written Bible Progress */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Written Bible Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {Math.round(progressStats?.textProgress.percentage || 0)}%
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      {progressStats?.textProgress.versesWithText || 0} of {progressStats?.textProgress.totalVerses || 0} chapters
                    </div>
                  </div>
                  <div className="w-20 h-20 relative">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="100, 100"
                        className="text-green-200 dark:text-green-800"
                      />
                      <path
                        d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${progressStats?.textProgress.percentage || 0}, 100`}
                        className="text-green-600 dark:text-green-400"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-green-900 dark:text-green-100">
                        Text
                      </span>
                    </div>
                  </div>
                </div>
                <Progress 
                  value={progressStats?.textProgress.percentage || 0} 
                  className="w-full h-2 bg-green-200 dark:bg-green-800"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <LoadingSpinner />
          ) : recentActivityData.length > 0 ? (
            <DataTable
              data={recentActivityData}
              columns={recentActivityColumns}
              searchable={false}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-600 dark:text-neutral-400">No recent activity found</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                Recent uploads and updates will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Information */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          {metadataLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.description || 'No description provided'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Source Language</h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.sourceLanguage?.name || 'Not specified'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Target Language</h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.targetLanguage?.name || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Region</h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.region?.name || 'Not specified'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Team Members</h3>
                  {projectMetadata?.users && projectMetadata.users.length > 0 ? (
                    <div className="space-y-2">
                      {projectMetadata.users.map((userRole, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-neutral-900 dark:text-neutral-100">
                            {userRole.user.first_name} {userRole.user.last_name}
                          </span>
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            {userRole.roles.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-600 dark:text-neutral-400">No team members found</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Created</h3>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {projectMetadata?.createdAt ? new Date(projectMetadata.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}); 