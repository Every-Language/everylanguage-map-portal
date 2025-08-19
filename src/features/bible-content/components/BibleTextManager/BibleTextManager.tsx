import React from 'react';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { VersionSelector } from '../../../../shared/components';
import { BibleTextUploadModal } from '../../../upload/components';
import { useBibleTextManagement } from '../../hooks/useBibleTextManagement';
import { BibleTextFiltersComponent } from './BibleTextFilters';
import { BibleTextTable } from './BibleTextTable';
import { BibleTextEditModal } from './BibleTextEditModal';
import { TextVersionModal } from './TextVersionModal';
import { ConfirmationModal } from '../../../../shared/components/ConfirmationModal';
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
      allowAllVersions={false}
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
      textVersions={bibleTextState.textVersions}
    />
  );

  const table = (
    <BibleTextTable 
      filteredAndSortedTexts={bibleTextState.filteredAndSortedTexts}
      isLoading={bibleTextState.isLoading}
      sortField={bibleTextState.sortField || 'created_at'}
      sortDirection={bibleTextState.sortDirection || 'desc'}
      handleSort={bibleTextState.handleSort}
      searchText={bibleTextState.filters.searchText}
      onSearchChange={(value) => bibleTextState.handleFilterChange('searchText', value)}
      selectedItems={Array.from(bibleTextState.selectedItems)}
      allCurrentPageSelected={bibleTextState.allCurrentPageSelected}
      someCurrentPageSelected={bibleTextState.someCurrentPageSelected}
      handleSelectAll={() => bibleTextState.handleSelectAll(true)}
      handleRowSelect={(id: string) => bibleTextState.handleRowSelect(id, true)}
      handleEditClick={bibleTextState.handleEditClick}
      handlePublishStatusChange={(textId: string, status: string) => 
        bibleTextState.handlePublishStatusChange(textId, status as 'pending' | 'published' | 'archived')
      }
      handleDelete={bibleTextState.handleDelete}
      executeBulkOperation={bibleTextState.executeBulkOperation}
      clearSelection={bibleTextState.clearSelection}
      openModal={bibleTextState.openModal}
      // Pagination props
      currentPage={bibleTextState.currentPage}
      itemsPerPage={bibleTextState.itemsPerPage}
      totalItems={bibleTextState.totalItems}
      totalPages={bibleTextState.totalPages}
      onPageChange={bibleTextState.handlePageChange}
      onPageSizeChange={bibleTextState.handlePageSizeChange}
    />
  );

  const modals = (
    <>
      <BibleTextUploadModal
        open={bibleTextState.isModalOpen('upload')}
        onOpenChange={(open: boolean) => !open && bibleTextState.closeModal()}
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
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={bibleTextState.confirmationModal.isOpen}
        onClose={bibleTextState.handleCancelConfirmation}
        onConfirm={bibleTextState.handleConfirmAction}
        title={bibleTextState.confirmationModal.type === 'delete' ? 'Delete Texts' : 'Restore Texts'}
        message={bibleTextState.confirmationModal.message}
        confirmText={bibleTextState.confirmationModal.type === 'delete' ? 'Delete' : 'Restore'}
        variant={bibleTextState.confirmationModal.type === 'delete' ? 'danger' : 'info'}
        isLoading={bibleTextState.softDeleteVerseTextsMutation.isPending || bibleTextState.restoreVerseTextsMutation.isPending}
      />
    </>
  );

  return (
    <div className="space-y-6">
      {/* Version Selector - Sticky */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900">
        {versionSelector}
      </div>

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