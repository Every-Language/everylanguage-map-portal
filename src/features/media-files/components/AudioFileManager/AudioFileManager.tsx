import React from 'react';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { VersionSelector } from '../../../../shared/components';
import { AudioUploadModal, UploadProgressDisplay } from '../../../upload/components';
import { useAudioFileManagement } from '../../hooks/useAudioFileManagement';
import { AudioFileFiltersComponent } from './AudioFileFilters';
import { AudioFileTable } from './AudioFileTable';
import { AudioFileEditModal } from './AudioFileEditModal';
import { AudioVersionModal } from './AudioVersionModal';
import { VerseMarkingModal } from './VerseMarkingModal';
import { VerseTimestampImportModal } from './VerseTimestampImportModal';
import { Button, Alert, Progress, Card, CardContent } from '../../../../shared/design-system';
import { PlusIcon, ClockIcon } from '@heroicons/react/24/outline';

interface AudioFileManagerProps {
  projectId: string;
  projectName: string;
}

export const AudioFileManager: React.FC<AudioFileManagerProps> = ({ 
  projectId, 
  projectName 
}) => {
  const audioFileState = useAudioFileManagement(projectId);

  const versionSelector = (
    <VersionSelector
      title="Audio Version"
      selectedVersionId={audioFileState.filters.audioVersionId}
      onVersionChange={(versionId) => audioFileState.handleFilterChange('audioVersionId', versionId)}
      versions={audioFileState.audioVersions}
      versionsLoading={audioFileState.isLoading}
    >
      <Button 
        variant="outline" 
        onClick={() => audioFileState.openModal('audioVersion')}
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        New Audio Version
      </Button>
    </VersionSelector>
  );

  const actions = (
    <div className="flex items-center space-x-3">
      <Button onClick={() => audioFileState.openModal('upload')}>
        <PlusIcon className="h-4 w-4 mr-2" />
        Upload Audio
      </Button>
      <Button 
        variant="outline" 
        onClick={() => audioFileState.openModal('verseTimestampImport')}
      >
        <ClockIcon className="h-4 w-4 mr-2" />
        Import Verse Timestamps
      </Button>
    </div>
  );

  const filters = (
    <AudioFileFiltersComponent 
      filters={audioFileState.filters}
      handleFilterChange={audioFileState.handleFilterChange}
      books={audioFileState.books}
      chapters={audioFileState.chapters}
    />
  );

  const table = (
    <AudioFileTable 
      mediaFiles={audioFileState.mediaFiles}
      isLoading={audioFileState.isLoading}
      selectedItems={audioFileState.selectedItems}
      allCurrentPageSelected={audioFileState.allCurrentPageSelected}
      someCurrentPageSelected={audioFileState.someCurrentPageSelected}
      sortField={audioFileState.sortField}
      sortDirection={audioFileState.sortDirection}
      handleSort={audioFileState.handleSort}
      searchText={audioFileState.filters.searchText}
      onSearchChange={(value) => audioFileState.handleFilterChange('searchText', value)}
      handleSelectAll={audioFileState.handleSelectAll}
      handleRowSelect={audioFileState.handleRowSelect}
      handleEditClick={audioFileState.handleEditClick}
      handlePublishStatusChange={audioFileState.handlePublishStatusChange}
      handlePlay={audioFileState.handlePlay}
      handleDownload={audioFileState.handleDownload}
      handleVerseMarking={audioFileState.handleVerseMarking}
      executeBulkOperation={audioFileState.executeBulkOperation}
      clearSelection={audioFileState.clearSelection}
      downloadState={audioFileState.downloadState}
      loadingAudioId={audioFileState.loadingAudioId}
      currentPage={audioFileState.currentPage}
      itemsPerPage={audioFileState.itemsPerPage}
      totalItems={audioFileState.totalItems}
      totalPages={audioFileState.totalPages}
      onPageChange={audioFileState.handlePageChange}
      onPageSizeChange={audioFileState.handlePageSizeChange}
    />
  );

  const modals = (
    <>
      <AudioUploadModal
        open={audioFileState.isModalOpen('upload')}
        onOpenChange={(open) => open ? audioFileState.openModal('upload') : audioFileState.closeModal()}
        onUploadComplete={audioFileState.handleUploadComplete}
      />

      <AudioFileEditModal
        open={audioFileState.isModalOpen('edit')}
        onOpenChange={(open) => open ? null : audioFileState.closeModal()}
        editForm={audioFileState.editForm}
        books={audioFileState.books}
        chapters={audioFileState.chapters}
        chapterVerses={audioFileState.chapterVerses}
        handleSaveEdit={audioFileState.handleSaveEdit}
        updateMediaFile={audioFileState.updateMediaFile}
      />

      <AudioVersionModal
        open={audioFileState.isModalOpen('audioVersion')}
        onOpenChange={(open) => open ? audioFileState.openModal('audioVersion') : audioFileState.closeModal()}
        audioVersionForm={audioFileState.audioVersionForm}
        bibleVersions={audioFileState.bibleVersions}
        handleCreateAudioVersion={audioFileState.handleCreateAudioVersion}
        createAudioVersionMutation={audioFileState.createAudioVersionMutation}
      />

      <VerseMarkingModal
        open={audioFileState.verseMarking.isOpen}
        onOpenChange={audioFileState.verseMarking.closeModal}
        mediaFile={audioFileState.verseMarking.currentMediaFile}
        audioUrl={audioFileState.verseMarking.audioUrl}
        onSave={audioFileState.verseMarking.saveVerses}
        existingVerses={audioFileState.verseMarking.existingVerses}
        isLoading={audioFileState.verseMarking.isSaving}
        isLoadingAudio={audioFileState.verseMarking.isLoadingAudio}
      />

      <VerseTimestampImportModal
        open={audioFileState.isModalOpen('verseTimestampImport')}
        onOpenChange={(open) => open ? audioFileState.openModal('verseTimestampImport') : audioFileState.closeModal()}
        onImportComplete={audioFileState.handleUploadComplete}
        selectedAudioVersionId={audioFileState.filters.audioVersionId !== 'all' ? audioFileState.filters.audioVersionId : undefined}
      />
    </>
  );

  return (
    <div className="space-y-6">
      {/* Version Selector - Sticky */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900">
        {versionSelector}
      </div>

      {/* Upload Progress Display - Sticky below version selector */}
      <div className="sticky top-[84px] z-20 bg-white dark:bg-gray-900">
        <UploadProgressDisplay />
      </div>

      {/* Download Error Alert */}
      {audioFileState.downloadState.error && (
        <Alert variant="destructive">
          <div className="flex justify-between items-center">
            <span>{audioFileState.downloadState.error}</span>
            <Button variant="outline" size="sm" onClick={audioFileState.clearDownloadError}>
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {/* Download Progress */}
      {audioFileState.downloadState.isDownloading && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Downloading...</span>
              <span className="text-sm text-gray-500">{Math.round(audioFileState.downloadState.progress)}%</span>
            </div>
            <Progress value={audioFileState.downloadState.progress} className="w-full" />
          </CardContent>
        </Card>
      )}

      <DataManagementLayout
        title="Audio Files"
        description={`Manage audio files for ${projectName}`}
        actions={actions}
        filters={filters}
        table={table}
        modals={modals}
      />
    </div>
  );
}; 