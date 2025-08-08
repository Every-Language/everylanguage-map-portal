import { useCallback, useEffect } from 'react';
import { useAudioVersionsByProject } from '../../../shared/hooks/query/audio-versions';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { useUploadWarning } from '../../../shared/stores/upload';
import { useAudioUpload, useAudioFileProcessing } from '../hooks';
import { calculateUploadStats } from '../utils/audioUploadUtils';
import { type ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';
import {
  AudioUploadHeader,
  UploadProgressSection,
  UploadStatsSection,
  FilenameAnalysisSection,
  FileUploadArea,
  AudioFileList,
  UploadHelpText
} from '../components/AudioUploadComponents';

export function AudioUploadPage() {
  const { selectedProject } = useSelectedProject();
  
  // Enable beforeunload warning
  useUploadWarning();

  // Upload state management
  const {
    audioFiles,
    setAudioFiles,
    isUploading,
    selectedAudioVersionId,
    setSelectedAudioVersionId,
    uploadProgress,
    selectedFileForPreview,
    setSelectedFileForPreview,
    filesReadyForUpload,
    uploadSummary,
    handleUpload,
    removeFile,
    clearAllFiles,
  } = useAudioUpload();

  // File processing
  const {
    isProcessing,
    processFiles,
    updateProcessedFile,
  } = useAudioFileProcessing();

  // Get audio versions for the selected project
  const { data: audioVersions } = useAudioVersionsByProject(selectedProject?.id || '');

  // Auto-select the first audio version if available
  useEffect(() => {
    if (audioVersions && audioVersions.length > 0 && !selectedAudioVersionId) {
      setSelectedAudioVersionId(audioVersions[0].id);
    }
  }, [audioVersions, selectedAudioVersionId, setSelectedAudioVersionId]);

  // Handle file selection/drop
  const handleFilesChange = useCallback(async (files: File[]) => {
    await processFiles(files, (processedFiles) => {
      setAudioFiles(prev => [...prev, ...processedFiles]);
    });
  }, [processFiles, setAudioFiles]);

  // Enhanced update file selection with processor
  const handleUpdateFileSelection = useCallback((fileId: string, updates: Partial<ProcessedAudioFile>) => {
    setAudioFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? updateProcessedFile(file, updates)
          : file
      )
    );
  }, [setAudioFiles, updateProcessedFile]);

  // Calculate upload statistics
  const uploadStats = calculateUploadStats(audioFiles);
  const needsAudioVersion = !audioVersions || audioVersions.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <AudioUploadHeader
        selectedAudioVersionId={selectedAudioVersionId}
        onAudioVersionChange={setSelectedAudioVersionId}
        audioVersions={audioVersions}
        needsAudioVersion={needsAudioVersion}
      />

      {/* Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Upload Progress Display */}
          <UploadProgressSection
            uploadSummary={uploadSummary}
            uploadProgress={uploadProgress}
          />

          {/* Upload Stats */}
          <UploadStatsSection
            uploadStats={uploadStats}
            filesReadyForUpload={filesReadyForUpload}
          />

          {/* Filename Parsing Stats */}
          <FilenameAnalysisSection
            uploadStats={uploadStats}
          />

          {/* Main Upload Area */}
          <FileUploadArea
            onFilesChange={handleFilesChange}
            isProcessing={isProcessing}
          />

          {/* File List */}
          {selectedProject && (
            <AudioFileList
              audioFiles={audioFiles}
              selectedFileForPreview={selectedFileForPreview}
              isUploading={isUploading}
              filesReadyForUpload={filesReadyForUpload}
              invalidFilesCount={uploadStats.invalidFiles}
              needsAudioVersion={needsAudioVersion}
              onPreviewToggle={setSelectedFileForPreview}
              onRemoveFile={removeFile}
              onUpdateFileSelection={handleUpdateFileSelection}
              onClearAllFiles={clearAllFiles}
              onUpload={handleUpload}
            />
          )}

          {/* Help Text */}
          <UploadHelpText />
        </div>
      </div>
    </div>
  );
} 