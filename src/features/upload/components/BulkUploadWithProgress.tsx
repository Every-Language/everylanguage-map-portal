import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '../../../shared/design-system/components/Button';
import { Card } from '../../../shared/design-system/components/Card';
import { LoadingSpinner } from '../../../shared/design-system/components/LoadingSpinner';
import { BulkUploadManager, type BulkUploadFile, type BulkUploadMetadata } from '../../../shared/services/bulkUploadService';
import { useUploadProgress } from '../hooks/useUploadProgress';
import { UploadProgressDisplay } from './UploadProgressDisplay';
import { supabase } from '../../../shared/services/supabase';
import type { ProcessedAudioFile } from '../../../shared/services/audioFileProcessor';

export interface BulkUploadWithProgressProps {
  /** Language entity ID for the uploads */
  languageEntityId: string;
  
  /** Audio version ID for the uploads */
  audioVersionId: string;
  
  /** Called when uploads are complete */
  onUploadComplete?: () => void;
  
  /** Called when an error occurs */
  onError?: (error: string) => void;
  
  /** Optional: Transform file metadata before upload */
  transformMetadata?: (file: File, defaultMetadata: BulkUploadMetadata) => BulkUploadMetadata;
}

export function BulkUploadWithProgress({
  languageEntityId,
  audioVersionId,
  onUploadComplete,
  onError,
  transformMetadata
}: BulkUploadWithProgressProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the new upload progress hook
  const {
    progressData,
    error: progressError,
    startTracking,
    stopTracking,
    isTracking
  } = useUploadProgress({
    pollingInterval: 2000,
    autoStopOnComplete: true
  });

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Filter for audio files only
    const audioFiles = files.filter(file => 
      file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i)
    );
    setSelectedFiles(audioFiles);
    setUploadError(null);
  }, []);

  // Generate metadata for files
  const generateMetadata = useCallback((files: File[]) => {
    return files.map((file, index) => {
      // Extract chapter info from filename (customize this logic for your naming convention)
      const fileName = file.name;
      const chapterMatch = fileName.match(/chapter[_-]?(\d+)/i) || fileName.match(/(\d+)/);
      const chapterNumber = chapterMatch ? chapterMatch[1] : String(index + 1);

      const defaultMetadata = {
        fileName: file.name,
        languageEntityId,
        audioVersionId,
        chapterId: `chapter-${chapterNumber}`,
        startVerseId: `verse-${chapterNumber}-1`,
        endVerseId: `verse-${chapterNumber}-999`,
        durationSeconds: 0, // Will be calculated during upload
        // Add verseTimings and tagIds as needed
      };

      // Allow custom transformation of metadata
      return transformMetadata ? transformMetadata(file, defaultMetadata) : defaultMetadata;
    });
  }, [languageEntityId, audioVersionId, transformMetadata]);

  // Handle upload start
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Create bulk upload files
      const metadata = generateMetadata(selectedFiles);
      const bulkUploadFiles: BulkUploadFile[] = selectedFiles.map((file, index) => ({
        file: { file, name: file.name } as ProcessedAudioFile, // Simplified for demo
        metadata: metadata[index]
      }));

      // Create upload manager and start upload
      const uploadManager = new BulkUploadManager();
      const response = await uploadManager.startBulkUpload(bulkUploadFiles, session.access_token);

             if (response.success && response.data) {
         // Extract media file IDs for progress tracking
         const fileIds = response.data.mediaRecords
           .map(record => record.mediaFileId)
           .filter(Boolean);
         
         // Start tracking progress
         if (fileIds.length > 0) {
           startTracking(fileIds);
         }
         
         // Clear selected files since upload has started
         setSelectedFiles([]);
         
         console.log('✅ Bulk upload started successfully:', response);
       } else {
         throw new Error(response.error || 'Upload failed');
       }
     } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Upload failed';
       console.error('❌ Upload error:', error);
       setUploadError(errorMessage);
       onError?.(errorMessage);
     } finally {
       setIsUploading(false);
     }
   }, [selectedFiles, generateMetadata, startTracking, onError]);

   // Handle file removal
   const removeFile = useCallback((index: number) => {
     setSelectedFiles(files => files.filter((_, i) => i !== index));
   }, []);

   // Reset upload state
   const resetUpload = useCallback(() => {
     setSelectedFiles([]);
     setUploadError(null);
     stopTracking();
     if (fileInputRef.current) {
       fileInputRef.current.value = '';
     }
   }, [stopTracking]);

   // Trigger file input click
   const handleSelectFiles = useCallback(() => {
     fileInputRef.current?.click();
   }, []);

  // Handle upload completion
  useEffect(() => {
    if (progressData?.progress.status === 'completed' && onUploadComplete) {
      console.log('🎉 All uploads completed');
      onUploadComplete();
    }
  }, [progressData?.progress.status, onUploadComplete]);

  return (
    <div className="space-y-6">
      {/* Progress Display - Show when tracking is active */}
      {isTracking && (
        <UploadProgressDisplay
          externalProgressData={progressData}
          visible={true}
          onClose={resetUpload}
        />
      )}

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
              Bulk Audio Upload
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400">
              Upload multiple audio files at once. Progress will be tracked in real-time.
            </p>
          </div>

                     {/* File Selection */}
           {selectedFiles.length === 0 && !isTracking && (
             <div>
               <input
                 ref={fileInputRef}
                 type="file"
                 multiple
                 accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
                 onChange={handleFileSelect}
                 className="hidden"
               />
               <div
                 onClick={handleSelectFiles}
                 className="border-2 border-dashed border-secondary-300 dark:border-secondary-600 hover:border-secondary-400 dark:hover:border-secondary-500 rounded-lg p-8 text-center cursor-pointer transition-colors"
               >
                 <div className="text-secondary-600 dark:text-secondary-400">
                   <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                   </svg>
                   <div>
                     <p className="text-lg font-medium mb-2">Click to select audio files</p>
                     <p className="text-sm">Supports: MP3, WAV, M4A, AAC, FLAC, OGG</p>
                   </div>
                 </div>
               </div>
             </div>
           )}

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-secondary-900 dark:text-secondary-100">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-secondary-200 dark:border-secondary-700 rounded-lg p-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-secondary-50 dark:bg-secondary-800 p-3 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-secondary-900 dark:text-secondary-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-secondary-500 dark:text-secondary-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex items-center space-x-2"
                >
                  {isUploading && <LoadingSpinner size="sm" />}
                  <span>{isUploading ? 'Starting Upload...' : `Upload ${selectedFiles.length} Files`}</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={resetUpload}
                  disabled={isUploading}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Progress Info */}
          {isTracking && progressData && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Upload in Progress
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {progressData.progress.percentage}% complete - 
                {progressData.completedCount} of {progressData.totalFiles} files uploaded
                {progressData.uploadingCount > 0 && ` (${progressData.uploadingCount} currently uploading)`}
              </p>
            </div>
          )}

          {/* Error Messages */}
          {(uploadError || progressError) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              <strong>Error:</strong> {uploadError || progressError}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 