import React from 'react';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { Card, CardContent } from '../../../../shared/design-system';
import { useBibleProgress } from '../../hooks/useBibleProgress';
import { BibleProgressStatsCards } from './BibleProgressStatsCards';
import { BibleProgressVersionSelectors } from './BibleProgressVersionSelectors';
import { BibleProgressTable } from './BibleProgressTable';
import { ChapterUploadModal } from './ChapterUploadModal';

interface BibleProgressManagerProps {
  projectName: string;
}

export const BibleProgressManager: React.FC<BibleProgressManagerProps> = ({ 
  projectName 
}) => {
  const progressState = useBibleProgress();



  const versionSelectors = (
    <BibleProgressVersionSelectors
      selectedVersionType={progressState.selectedVersionType}
      setSelectedVersionType={progressState.setSelectedVersionType}
      setSelectedAudioVersion={progressState.setSelectedAudioVersion}
      setSelectedTextVersion={progressState.setSelectedTextVersion}
      availableVersions={progressState.availableVersions}
      currentVersionId={progressState.currentVersionId}
    />
  );

  const statsCards = (
    <BibleProgressStatsCards
      progressStats={progressState.progressStats}
      isLoading={progressState.statsLoading}
    />
  );

  const tableSection = (
    <BibleProgressTable
      bookData={progressState.bookData}
      isLoading={progressState.bookDataLoading}
      selectedVersionType={progressState.selectedVersionType}
      onBookExpand={progressState.loadDetailedProgressForBook}
    />
  );

  const modalsSection = <ChapterUploadModal />;

  if (!progressState.hasData) {
    const emptyTable = (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
          {progressState.isLoading ? 'Loading...' : 'Select Version'}
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400">
          {progressState.isLoading 
            ? 'Please wait while we load your Bible data...' 
            : 'Choose an audio/text version above to view progress statistics.'
          }
        </p>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Version Selectors - Sticky */}
        <div className="sticky top-0 z-30 bg-white dark:bg-gray-900">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Filters
                  </h3>
                </div>
                <div className="flex items-center space-x-4 flex-1 justify-end">
                  {versionSelectors}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DataManagementLayout
          title="Bible Progress"
          description={`Track recording progress for ${projectName}`}
          table={emptyTable}
          modals={modalsSection}
        >
          {statsCards}
        </DataManagementLayout>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Version Selectors - Sticky */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Filters
                </h3>
              </div>
              <div className="flex items-center space-x-4 flex-1 justify-end">
                {versionSelectors}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataManagementLayout
        title="Bible Progress"
        description={`Track recording progress for ${projectName}`}
        table={tableSection}
        modals={modalsSection}
      >
        {statsCards}
      </DataManagementLayout>
    </div>
  );
}; 