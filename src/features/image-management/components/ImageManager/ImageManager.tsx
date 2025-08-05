import React from 'react';
import { useImageManagement } from '../../hooks/useImageManagement';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { VersionSelector } from '../../../../shared/components';
import { ImageTable } from './ImageTable.tsx';
import { CreateImageSetModal } from './CreateImageSetModal.tsx';
import { EditImageModal } from './EditImageModal.tsx';
import { ImageUploadModal } from '../../../../features/upload/components/ImageUploadModal';
import { Alert, Button } from '../../../../shared/design-system';
import { PlusIcon } from '@heroicons/react/24/outline';

export const ImageManager: React.FC = () => {
  const imageManagement = useImageManagement();

  if (!imageManagement.user) {
    return (
      <Alert variant="warning">
        Please log in to view your images.
      </Alert>
    );
  }

  const imageSetSelector = (
    <VersionSelector
      title="Image Set"
      selectedVersionId={imageManagement.filters.setId}
      onVersionChange={(setId) => imageManagement.operations.handleFilterChange('setId', setId)}
      versions={imageManagement.imageSets.map(set => ({ id: set.id, name: set.name }))}
      versionsLoading={imageManagement.isLoading}
      allowAllVersions={true}
    >
      <Button 
        variant="outline" 
        onClick={imageManagement.modals.openCreateSet}
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Create Set
      </Button>
    </VersionSelector>
  );

  const actions = (
    <Button onClick={imageManagement.modals.openUpload}>
      <PlusIcon className="h-4 w-4 mr-2" />
      Upload Images
    </Button>
  );

  const tableSection = (
    <ImageTable
      images={imageManagement.filteredImages}
      isLoading={imageManagement.isLoading}
      selectedImages={imageManagement.selectedImages}
      allCurrentPageSelected={imageManagement.selection.allCurrentPageSelected}
      someCurrentPageSelected={imageManagement.selection.someCurrentPageSelected}
      onSelectAll={imageManagement.selection.handleSelectAll}
      onRowSelect={imageManagement.selection.handleRowSelect}
      onEditClick={imageManagement.modals.openEdit}
      onPublishStatusChange={imageManagement.operations.handlePublishStatusChange}
      onOpenUpload={() => imageManagement.modals.openUpload()}
      getFilenameFromPath={imageManagement.utils.getFilenameFromPath}
      getTargetDisplayName={imageManagement.utils.getTargetDisplayName}
      getSetName={imageManagement.utils.getSetName}
      updatePublishStatusPending={imageManagement.mutations.updatePublishStatus.isPending}
      
      // Search functionality
      searchText={imageManagement.filters.searchText}
      onSearchChange={(value) => imageManagement.operations.handleFilterChange('searchText', value)}
      
      // Bulk operations
      onBulkPublishStatusChange={imageManagement.operations.handleBulkPublishStatusChange}
      onClearSelection={imageManagement.selection.clearSelection}
      batchUpdatePending={imageManagement.mutations.batchUpdatePublishStatus.isPending}
    />
  );

  const modalsSection = (
    <>
      {/* Upload Modal */}
      <ImageUploadModal
        open={imageManagement.modals.showUpload}
        onOpenChange={imageManagement.modals.closeUpload}
        onUploadComplete={imageManagement.operations.handleUploadComplete}
      />

      {/* Create Image Set Modal */}
      {imageManagement.modals.showCreateSet && (
        <CreateImageSetModal
          isOpen={imageManagement.modals.showCreateSet}
          onClose={imageManagement.modals.closeCreateSet}
          formData={imageManagement.createSetForm.data}
          onUpdateField={imageManagement.createSetForm.updateField}
          onSubmit={imageManagement.operations.handleCreateSet}
          isValid={imageManagement.createSetForm.isValid}
          isPending={imageManagement.mutations.createImageSet.isPending}
        />
      )}

      {/* Edit Image Modal */}
      {imageManagement.modals.showEdit && imageManagement.editingImage && (
        <EditImageModal
          isOpen={imageManagement.modals.showEdit}
          onClose={imageManagement.modals.closeEdit}
          formData={imageManagement.editForm.data}
          onUpdateField={imageManagement.editForm.updateField}
          onSubmit={imageManagement.operations.handleSaveEdit}
          isPending={imageManagement.mutations.updateImage.isPending || imageManagement.mutations.updatePublishStatus.isPending}
        />
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Image Set Selector - Sticky */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900">
        {imageSetSelector}
      </div>

      <DataManagementLayout
        title="Images"
        description="Manage your uploaded images and image sets"
        actions={actions}
        table={tableSection}
        modals={modalsSection}
      />
    </div>
  );
}; 