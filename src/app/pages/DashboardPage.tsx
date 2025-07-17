import React, { useState } from 'react';
import { useAuth } from '../../features/auth';
import { useSelectedProject } from '../../features/dashboard';
import { 
  useRecentActivity, 
  useProjectStats, 
  useBibleVersionProgress, 
  useProjectMetadata 
} from '../../shared/hooks/query/dashboard';
import { type MediaFile } from '../../shared/hooks/query/media-files';
import { useBibleVersions } from '../../shared/hooks/query/bible-versions';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Select,
  SelectItem,
  Progress,
  LoadingSpinner
} from '../../shared/design-system';

export const DashboardPage: React.FC = React.memo(() => {
  const { user, dbUser } = useAuth();
  const { selectedProject } = useSelectedProject();
  const [selectedBibleVersion, setSelectedBibleVersion] = useState<string>('');

  // Data queries
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity(selectedProject?.id || null, 10);
  const { data: projectStats, isLoading: statsLoading } = useProjectStats(selectedProject?.id || null);
  const { data: bibleVersionProgress, isLoading: progressLoading } = useBibleVersionProgress(selectedProject?.id || null);
  const { data: projectMetadata, isLoading: metadataLoading } = useProjectMetadata(selectedProject?.id || null);
  const { data: bibleVersions } = useBibleVersions();

  // Set default bible version
  React.useEffect(() => {
    if (bibleVersions && bibleVersions.length > 0 && !selectedBibleVersion) {
      setSelectedBibleVersion(bibleVersions[0].id);
    }
  }, [bibleVersions, selectedBibleVersion]);

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

  const selectedVersionProgress = bibleVersionProgress?.find(vp => vp.version.id === selectedBibleVersion);

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

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-6">
              {/* Recent Media Files */}
              <div>
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Recently Updated Audio Files
                </h3>
                {recentActivity?.mediaFiles && recentActivity.mediaFiles.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.mediaFiles.slice(0, 5).map((file: MediaFile & { books?: { name: string }, chapters?: { chapter_number: number } }) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {file.books?.name} {file.chapters?.chapter_number}
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {file.upload_status} • {file.updated_at ? new Date(file.updated_at).toLocaleDateString() : 'Unknown date'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            file.check_status === 'approved' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : file.check_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {file.check_status || 'Not checked'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-600 dark:text-neutral-400">No recent audio file activity</p>
                )}
              </div>

              {/* Recent Uploads */}
              <div>
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Recent Uploads
                </h3>
                {recentActivity?.recentUploads && recentActivity.recentUploads.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.recentUploads.slice(0, 3).map((file: MediaFile) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {file.books?.name} {file.chapters?.chapter_number}
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Uploaded {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-600 dark:text-neutral-400">No recent uploads</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {statsLoading ? '...' : `${Math.round(projectStats?.overallProgress || 0)}%`}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Overall Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {statsLoading ? '...' : projectStats?.audioFilesCount || 0}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Audio Files</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {statsLoading ? '...' : `${projectStats?.totalVersesCovered || 0}`}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Verses Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {statsLoading ? '...' : projectStats?.textVersionsCount || 0}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Text Versions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bible Version Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Bible Progress by Version</CardTitle>
        </CardHeader>
        <CardContent>
          {progressLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-4">
              {/* Bible Version Selector */}
              <div className="w-full max-w-xs">
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

              {/* Progress Display */}
              {selectedVersionProgress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                      {selectedVersionProgress.version.name}
                    </h3>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {selectedVersionProgress.versesCovered} / {selectedVersionProgress.totalVerses} verses
                    </span>
                  </div>
                  <Progress 
                    value={selectedVersionProgress.progress} 
                    className="w-full h-3"
                  />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {selectedVersionProgress.progress.toFixed(1)}% complete
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Metadata */}
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