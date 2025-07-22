import React from 'react';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { BibleTextUploadModal } from '../../../upload/components';
import { useBibleTextManagement } from '../../hooks/useBibleTextManagement';
import { BibleTextFiltersComponent } from './BibleTextFilters';
import { BibleTextTable } from './BibleTextTable';
import { BibleTextEditModal } from './BibleTextEditModal';
import { Button } from '../../../../shared/design-system';

interface BibleTextManagerProps {
  projectId: string;
  projectName: string;
}

export const BibleTextManager: React.FC<BibleTextManagerProps> = ({ 
  projectId, 
  projectName 
}) => {
  const bibleTextState = useBibleTextManagement(projectId);

  const actions = (
    <Button onClick={() => bibleTextState.openModal('upload')}>
      Upload Text
    </Button>
  );

  const filters = (
    <BibleTextFiltersComponent 
      {...bibleTextState}
    />
  );

  const table = (
    <BibleTextTable 
      {...bibleTextState}
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
        {...bibleTextState}
      />
    </>
  );

  return (
    <DataManagementLayout
      title="Bible Text"
      description={`Manage verse text content for ${projectName}`}
      actions={actions}
      filters={filters}
      table={table}
      modals={modals}
    />
  );
}; 