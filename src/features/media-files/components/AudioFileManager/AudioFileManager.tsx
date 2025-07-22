import React from 'react';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { AudioUploadModal, UploadProgressDisplay } from '../../../upload/components';
import { useAudioFileManagement } from '../../hooks/useAudioFileManagement';
import { AudioFileFiltersComponent } from './AudioFileFilters';
import { AudioFileTable } from './AudioFileTable';
import { AudioFileEditModal } from './AudioFileEditModal';
import { AudioVersionModal } from './AudioVersionModal';
import { Button, Alert, Progress, Card, CardContent } from '../../../../shared/design-system';
import { PlusIcon } from '@heroicons/react/24/outline';

interface AudioFileManagerProps {
  projectId: string;
  projectName: string;
}

export const AudioFileManager: React.FC<AudioFileManagerProps> = ({ 
  projectId, 
  projectName 
}) => {
  const audioFileState = useAudioFileManagement(projectId);

  const actions = (
    <div className="flex items-center space-x-3">
      <Button 
        variant="outline" 
        onClick={() => audioFileState.openModal('audioVersion')}
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        New Audio Version
      </Button>
      <Button onClick={() => audioFileState.openModal('upload')}>
        <PlusIcon className="h-4 w-4 mr-2" />
        Upload Audio
      </Button>
    </div>
  );

  const filters = (
    <AudioFileFiltersComponent 
      {...audioFileState}
    />
  );

  const table = (
    <AudioFileTable 
      {...audioFileState}
    />
  );

  const modals = (
    <>
      <AudioUploadModal
        open={audioFileState.isModalOpen('upload')}
        onOpenChange={(open: boolean) => !open && audioFileState.closeModal()}
        onUploadComplete={audioFileState.handleUploadComplete}
      />
      
      <AudioFileEditModal
        open={audioFileState.isModalOpen('edit')}
        onOpenChange={(open: boolean) => !open && audioFileState.closeModal()}
        {...audioFileState}
      />

      <AudioVersionModal
        open={audioFileState.isModalOpen('audioVersion')}
        onOpenChange={(open: boolean) => !open && audioFileState.closeModal()}
        {...audioFileState}
      />
    </>
  );

  return (
    <div className="space-y-6">
      {/* Upload Progress Display */}
      <UploadProgressDisplay />

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