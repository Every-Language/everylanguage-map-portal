import React from 'react';
import { useImageManagement } from '../../hooks/useImageManagement';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { ImageFilters } from './ImageFilters.tsx';
import { ImageTable } from './ImageTable.tsx';
import { CreateImageSetModal } from './CreateImageSetModal.tsx';
import { EditImageModal } from './EditImageModal.tsx';
import { ImageUploadModal } from '../../../../features/upload/components/ImageUploadModal';
import { Alert } from '../../../../shared/design-system';

export const ImageManager: React.FC = () => {
  const imageManagement = useImageManagement();

  if (!imageManagement.user) {
    return (
      <Alert variant="warning">
        Please log in to view your images.
      </Alert>
    );
  }

  const filtersSection = (
    <ImageFilters
      filters={imageManagement.filters}
      imageSets={imageManagement.imageSets}
      onFilterChange={imageManagement.operations.handleFilterChange}
      selectedCount={imageManagement.selection.selectedCount}
      onBulkPublishStatusChange={imageManagement.operations.handleBulkPublishStatusChange}
      onClearSelection={imageManagement.selection.clearSelection}
      batchUpdatePending={imageManagement.mutations.batchUpdatePublishStatus.isPending}
    />
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
    <DataManagementLayout
      title="Images"
      description="Manage your uploaded images and image sets"
      actions={
        <div className="flex items-center space-x-3">
          <button
            onClick={imageManagement.modals.openCreateSet}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            Create Set
          </button>
          <button
            onClick={imageManagement.modals.openUpload}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Upload Images
          </button>
        </div>
      }
      filters={filtersSection}
      table={tableSection}
      modals={modalsSection}
    />
  );
}; 