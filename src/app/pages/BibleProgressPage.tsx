import React, { useState } from 'react';
import { useSelectedProject } from '../../features/dashboard/hooks/useSelectedProject';
import { useBibleVersions } from '../../shared/hooks/query/bible-versions';
import { useBibleProgressStats, useChapterTableData } from '../../shared/hooks/query/dashboard';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Select,
  SelectItem,
  LoadingSpinner,
  CircularProgress,
  DataTable,
  Progress,
  type Column
} from '../../shared/design-system';

type ChapterRow = {
  id: string;
  bookName: string;
  chapterNumber: number;
  totalVerses: number;
  versesCovered: number;
  progressFraction: number;
  mediaFiles: Array<{
    id: string;
    remote_path: string | null;
    duration_seconds: number | null;
  }>;
  status: 'complete' | 'in_progress' | 'not_started';
};

export const BibleProgressPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  const [selectedBibleVersion, setSelectedBibleVersion] = useState<string>('');

  // Data queries
  const { data: bibleVersions, isLoading: versionsLoading } = useBibleVersions();
  const { data: progressStats, isLoading: statsLoading } = useBibleProgressStats(
    selectedProject?.id || null, 
    selectedBibleVersion || null
  );
  const { data: chapterData, isLoading: chaptersLoading } = useChapterTableData(
    selectedProject?.id || null,
    selectedBibleVersion || null
  );

  // Set default bible version
  React.useEffect(() => {
    if (bibleVersions && bibleVersions.length > 0 && !selectedBibleVersion) {
      setSelectedBibleVersion(bibleVersions[0].id);
    }
  }, [bibleVersions, selectedBibleVersion]);

  // Table columns definition
  const columns: Column<ChapterRow>[] = [
    {
      key: 'bookName',
      header: 'Book',
      sortable: true,
      filterable: true,
      width: '200px'
    },
    {
      key: 'chapterNumber',
      header: 'Chapter',
      sortable: true,
      width: '80px',
      render: (value) => `Chapter ${value}`
    },
    {
      key: 'progressFraction',
      header: 'Progress',
      sortable: true,
      width: '200px',
      render: (value, row) => (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{row.versesCovered}/{row.totalVerses} verses</span>
            <span>{Math.round(value * 100)}%</span>
          </div>
          <Progress value={value * 100} className="h-2" />
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'complete', label: 'Complete' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'not_started', label: 'Not Started' }
      ],
      width: '120px',
      render: (value) => {
        const statusConfig = {
          complete: { 
            label: 'Complete', 
            className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
          },
          in_progress: { 
            label: 'In Progress', 
            className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
          },
          not_started: { 
            label: 'Not Started', 
            className: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200' 
          }
        };
        
        const config = statusConfig[value as keyof typeof statusConfig];
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'mediaFiles',
      header: 'Media Files',
      width: '150px',
      render: (value: ChapterRow['mediaFiles']) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {value.length} file{value.length !== 1 ? 's' : ''}
          </div>
          {value.length > 0 && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              Total: {Math.round(value.reduce((sum, file) => sum + (file.duration_seconds || 0), 0) / 60)}m
            </div>
          )}
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
            Please select a project from the sidebar to view Bible progress.
          </p>
        </div>
      </div>
    );
  }

  if (versionsLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
          <span className="ml-3 text-neutral-600 dark:text-neutral-400">Loading Bible versions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Bible Progress
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Track audio recording progress for {selectedProject.name}
        </p>
      </div>

      {/* Bible Version Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="max-w-sm">
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
        </CardContent>
      </Card>

      {/* Progress Statistics */}
      {selectedBibleVersion && progressStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Books Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Books Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-6">
              <div className="flex items-center space-x-6">
                <CircularProgress
                  value={progressStats.booksProgress.percentage}
                  size={120}
                  color="blue"
                  showPercentage={false}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {progressStats.booksProgress.completed}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      of {progressStats.booksProgress.total}
                    </div>
                  </div>
                </CircularProgress>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {Math.round(progressStats.booksProgress.percentage)}% Complete
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {progressStats.booksProgress.completed} of {progressStats.booksProgress.total} books fully recorded
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                    A book is complete when all its chapters are fully recorded
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chapters Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Chapters Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center p-6">
              <div className="flex items-center space-x-6">
                <CircularProgress
                  value={progressStats.chaptersProgress.percentage}
                  size={120}
                  color="green"
                  showPercentage={false}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {progressStats.chaptersProgress.completed}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      of {progressStats.chaptersProgress.total}
                    </div>
                  </div>
                </CircularProgress>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {Math.round(progressStats.chaptersProgress.percentage)}% Complete
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {progressStats.chaptersProgress.completed} of {progressStats.chaptersProgress.total} chapters fully recorded
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                    A chapter is complete when all verses are covered by audio files
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chapters Database View */}
      {selectedBibleVersion && (
        <Card>
          <CardHeader>
            <CardTitle>Chapter Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable<ChapterRow>
              data={chapterData || []}
              columns={columns}
              loading={statsLoading || chaptersLoading}
              searchPlaceholder="Search books and chapters..."
              emptyMessage="No chapter data available"
              rowClassName={(row) => {
                switch (row.status) {
                  case 'complete':
                    return 'bg-green-50 dark:bg-green-900/20';
                  case 'in_progress':
                    return 'bg-yellow-50 dark:bg-yellow-900/20';
                  default:
                    return '';
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* No Version Selected */}
      {!selectedBibleVersion && (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              Select a Bible Version
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Choose a Bible version above to view detailed progress statistics and chapter data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 