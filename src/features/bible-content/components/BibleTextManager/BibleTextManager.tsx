import React from 'react';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { VersionSelector } from '../../../../shared/components';
import { BibleTextUploadModal } from '../../../upload/components';
import { useBibleTextManagement } from '../../hooks/useBibleTextManagement';
import { BibleTextFiltersComponent } from './BibleTextFilters';
import { BibleTextTable } from './BibleTextTable';
import { BibleTextEditModal } from './BibleTextEditModal';
import { TextVersionModal } from './TextVersionModal';
import { Button } from '../../../../shared/design-system';
import { PlusIcon } from '@heroicons/react/24/outline';

interface BibleTextManagerProps {
  projectId: string;
  projectName: string;
}

export const BibleTextManager: React.FC<BibleTextManagerProps> = ({ 
  projectId, 
  projectName 
}) => {
  const bibleTextState = useBibleTextManagement(projectId);

  const versionSelector = (
    <VersionSelector
      title="Text Version"
      selectedVersionId={bibleTextState.filters.textVersionId}
      onVersionChange={(versionId) => bibleTextState.handleFilterChange('textVersionId', versionId)}
      versions={bibleTextState.textVersions}
      versionsLoading={bibleTextState.isLoading}
      searchable={true}
    >
      <Button 
        variant="outline" 
        onClick={() => bibleTextState.openModal('textVersion')}
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        New Text Version
      </Button>
    </VersionSelector>
  );

  const actions = (
    <Button onClick={() => bibleTextState.openModal('upload')}>
      <PlusIcon className="h-4 w-4 mr-2" />
      Upload Text
    </Button>
  );

  const filters = (
    <BibleTextFiltersComponent 
      filters={bibleTextState.filters}
      handleFilterChange={bibleTextState.handleFilterChange}
      books={bibleTextState.books}
      chapters={bibleTextState.chapters}
    />
  );

  const table = (
    <BibleTextTable 
      filteredAndSortedTexts={bibleTextState.filteredAndSortedTexts}
      isLoading={bibleTextState.isLoading}
      textVersions={bibleTextState.textVersions}
      sortField={bibleTextState.sortField}
      sortDirection={bibleTextState.sortDirection}
      handleSort={bibleTextState.handleSort}
      searchText={bibleTextState.filters.searchText}
      onSearchChange={(value) => bibleTextState.handleFilterChange('searchText', value)}
      selectedItems={bibleTextState.selectedItems}
      allCurrentPageSelected={bibleTextState.allCurrentPageSelected}
      someCurrentPageSelected={bibleTextState.someCurrentPageSelected}
      handleSelectAll={bibleTextState.handleSelectAll}
      handleRowSelect={bibleTextState.handleRowSelect}
      handleEditClick={bibleTextState.handleEditClick}
      handlePublishStatusChange={bibleTextState.handlePublishStatusChange}
      executeBulkOperation={bibleTextState.executeBulkOperation}
      clearSelection={bibleTextState.clearSelection}
      openModal={bibleTextState.openModal}
    />
  );

  const modals = (
    <>
      <BibleTextUploadModal
        open={bibleTextState.isModalOpen('upload')}
        onOpenChange={(open: boolean) => !open && bibleTextState.closeModal()}
        onUploadComplete={bibleTextState.handleUploadComplete}
      />
      
      <BibleTextEditModal
        open={bibleTextState.isModalOpen('edit')}
        onOpenChange={(open: boolean) => !open && bibleTextState.closeModal()}
        textVersions={bibleTextState.textVersions}
        books={bibleTextState.books}
        chapters={bibleTextState.chapters}
        chapterVerses={bibleTextState.chapterVerses}
        editForm={bibleTextState.editForm}
        handleSaveEdit={bibleTextState.handleSaveEdit}
        editVerseTextMutation={bibleTextState.editVerseTextMutation}
      />
      
      <TextVersionModal
        open={bibleTextState.isModalOpen('textVersion')}
        onOpenChange={(open) => open ? bibleTextState.openModal('textVersion') : bibleTextState.closeModal()}
        textVersionForm={bibleTextState.textVersionForm}
        bibleVersions={bibleTextState.bibleVersions}
        handleCreateTextVersion={bibleTextState.handleCreateTextVersion}
        createTextVersionMutation={bibleTextState.createTextVersionMutation}
      />
    </>
  );

  return (
    <div className="space-y-6">
      {/* Version Selector */}
      {versionSelector}

      <DataManagementLayout
        title="Bible Text"
        description={`Manage verse text content for ${projectName}`}
        actions={actions}
        filters={filters}
        table={table}
        modals={modals}
      />
    </div>
  );
}; 