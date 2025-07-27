import React from 'react';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
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
      selectedBibleVersion={progressState.selectedBibleVersion}
      setSelectedBibleVersion={progressState.setSelectedBibleVersion}
      bibleVersions={progressState.bibleVersions}
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
          {progressState.isLoading ? 'Loading...' : 'Select Bible and Version'}
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400">
          {progressState.isLoading 
            ? 'Please wait while we load your Bible data...' 
            : 'Choose a Bible version and audio/text version above to view progress statistics.'
          }
        </p>
      </div>
    );

    return (
      <DataManagementLayout
        title="Bible Progress"
        description={`Track recording progress for ${projectName}`}
        filters={versionSelectors}
        table={emptyTable}
        modals={modalsSection}
      >
        {statsCards}
      </DataManagementLayout>
    );
  }

  return (
    <DataManagementLayout
      title="Bible Progress"
      description={`Track recording progress for ${projectName}`}
      filters={versionSelectors}
      table={tableSection}
      modals={modalsSection}
    >
      {statsCards}
    </DataManagementLayout>
  );
}; 