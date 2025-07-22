import React, { useState, useCallback } from 'react';
import {
  FileUpload,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  LoadingSpinner
} from '@/shared/design-system/components';
import { AudioPlayer } from '@/shared/design-system/components/AudioPlayer';
import { useToast } from '@/shared/design-system/hooks/useToast';
import { parseFilename, type ParsedFilename } from '@/shared/services/filenameParser';

// Audio file types supported
const SUPPORTED_AUDIO_TYPES = [
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/m4a',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/webm'
];

const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'];

interface AudioFileWithMetadata extends File {
  id: string;
  duration?: number;
  detectedBook?: string;
  detectedChapter?: number;
  detectedVerses?: number[];
  verseRange?: string;
  filenameParseResult?: ParsedFilename;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  uploadError?: string;
}

interface AudioUploadStats {
  totalFiles: number;
  totalSize: number;
  estimatedDuration: number;
  validFiles: number;
  invalidFiles: number;
  parsingStats?: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    noMatch: number;
    booksDetected: number;
    chaptersDetected: number;
    versesDetected: number;
  };
}

export function AudioUploadPage() {
  const [audioFiles, setAudioFiles] = useState<AudioFileWithMetadata[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<AudioUploadStats>({
    totalFiles: 0,
    totalSize: 0,
    estimatedDuration: 0,
    validFiles: 0,
    invalidFiles: 0
  });
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Validate audio file
  const validateAudioFile = useCallback((file: File): string | null => {
    // Check file type
    if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      // Check by extension as fallback
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(extension)) {
        return `Unsupported file type. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`;
      }
    }

    // Check file size (max 500MB per file)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return `File size must be less than 500MB. Current size: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
    }

    // Check for empty files
    if (file.size === 0) {
      return 'File appears to be empty';
    }

    return null;
  }, []);

  // Extract audio metadata and parse filename
  const extractAudioMetadata = useCallback(async (file: File): Promise<Partial<AudioFileWithMetadata>> => {
    // Parse filename first
    const filenameParseResult = parseFilename(file.name);
    
    // Extract audio metadata
    const audioMetadata = await new Promise<{ duration?: number }>((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve({ duration: audio.duration });
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve({});
      });

      audio.src = url;
    });
    
    // Combine all metadata
    const metadata: Partial<AudioFileWithMetadata> = {
      duration: audioMetadata.duration,
      filenameParseResult,
      detectedBook: filenameParseResult.detectedBook,
      detectedChapter: filenameParseResult.detectedChapter,
      detectedVerses: filenameParseResult.detectedVerses,
      verseRange: filenameParseResult.verseRange
    };
    
    return metadata;
  }, []);

  // Calculate upload statistics
  const calculateStats = useCallback((files: AudioFileWithMetadata[]): AudioUploadStats => {
    const validFiles = files.filter(f => !f.uploadError);
    const invalidFiles = files.filter(f => f.uploadError);
    
    // Calculate parsing statistics
    const parsingStats = {
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      noMatch: 0,
      booksDetected: 0,
      chaptersDetected: 0,
      versesDetected: 0
    };
    
    files.forEach(file => {
      if (file.filenameParseResult) {
        switch (file.filenameParseResult.confidence) {
          case 'high':
            parsingStats.highConfidence++;
            break;
          case 'medium':
            parsingStats.mediumConfidence++;
            break;
          case 'low':
            parsingStats.lowConfidence++;
            break;
          case 'none':
            parsingStats.noMatch++;
            break;
        }
        
        if (file.detectedBook) parsingStats.booksDetected++;
        if (file.detectedChapter) parsingStats.chaptersDetected++;
        if (file.detectedVerses && file.detectedVerses.length > 0) parsingStats.versesDetected++;
      } else {
        parsingStats.noMatch++;
      }
    });
    
    return {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      estimatedDuration: validFiles.reduce((sum, file) => sum + (file.duration || 0), 0),
      validFiles: validFiles.length,
      invalidFiles: invalidFiles.length,
      parsingStats
    };
  }, []);

  // Handle file selection/drop
  const handleFilesChange = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    
    try {
      const processedFiles: AudioFileWithMetadata[] = [];
      
      for (const file of files) {
        const validationError = validateAudioFile(file);
        const audioFile: AudioFileWithMetadata = {
          ...file,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          uploadStatus: 'pending',
          uploadProgress: 0
        };
        
        if (validationError) {
          audioFile.uploadError = validationError;
          audioFile.uploadStatus = 'error';
        } else {
          // Extract metadata for valid files
          try {
            const metadata = await extractAudioMetadata(file);
            Object.assign(audioFile, metadata);
          } catch (error) {
            console.warn('Failed to extract metadata for', file.name, error);
          }
        }
        
        processedFiles.push(audioFile);
      }
      
      setAudioFiles(prev => [...prev, ...processedFiles]);
      const newStats = calculateStats([...audioFiles, ...processedFiles]);
      setUploadStats(newStats);
      
      if (processedFiles.some(f => f.uploadError)) {
        toast({
          title: 'Some files have issues',
          description: `${processedFiles.filter(f => f.uploadError).length} files could not be processed`,
          variant: 'warning'
        });
      } else {
        toast({
          title: 'Files added successfully',
          description: `${processedFiles.length} audio files ready for upload`,
          variant: 'success'
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: 'Error processing files',
        description: 'Some files could not be processed. Please try again.',
        variant: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [audioFiles, validateAudioFile, extractAudioMetadata, calculateStats, toast]);

  // Remove file from list
  const removeFile = useCallback((fileId: string) => {
    setAudioFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      setUploadStats(calculateStats(updated));
      return updated;
    });
    
    if (selectedFileForPreview === fileId) {
      setSelectedFileForPreview(null);
    }
  }, [calculateStats, selectedFileForPreview]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    const validFiles = audioFiles.filter(f => !f.uploadError);
    
    if (validFiles.length === 0) {
      toast({
        title: 'No valid files to upload',
        description: 'Please add valid audio files before uploading',
        variant: 'warning'
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Simulate upload process (replace with actual upload logic)
      for (const file of validFiles) {
        // Update file status to uploading
        setAudioFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, uploadStatus: 'uploading' as const, uploadProgress: 0 }
            : f
        ));

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setAudioFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: progress }
              : f
          ));
        }

        // Mark as successful
        setAudioFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, uploadStatus: 'success' as const, uploadProgress: 100 }
            : f
        ));
      }

      toast({
        title: 'Upload completed',
        description: `Successfully uploaded ${validFiles.length} audio files`,
        variant: 'success'
      });

      // Navigate to next step (e.g., review uploaded files)
      // navigate('/upload/review');
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your files. Please try again.',
        variant: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  }, [audioFiles, toast]);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setAudioFiles([]);
    setUploadStats({
      totalFiles: 0,
      totalSize: 0,
      estimatedDuration: 0,
      validFiles: 0,
      invalidFiles: 0
    });
    setSelectedFileForPreview(null);
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (isNaN(seconds)) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Upload Audio Files
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Drag and drop your audio files below, or click to browse and select files
          </p>
        </div>

        {/* Upload Stats */}
        {uploadStats.totalFiles > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {uploadStats.totalFiles}
                  </div>
                  <div className="text-sm text-gray-600">Total Files</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {uploadStats.validFiles}
                  </div>
                  <div className="text-sm text-gray-600">Valid Files</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatFileSize(uploadStats.totalSize)}
                  </div>
                  <div className="text-sm text-gray-600">Total Size</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatDuration(uploadStats.estimatedDuration)}
                  </div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filename Parsing Stats */}
        {uploadStats.parsingStats && uploadStats.totalFiles > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Filename Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Confidence Level Stats */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Detection Confidence
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    {uploadStats.parsingStats.highConfidence > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <div className="text-xl font-bold text-green-600">
                          {uploadStats.parsingStats.highConfidence}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300">High Confidence</div>
                      </div>
                    )}
                    {uploadStats.parsingStats.mediumConfidence > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                        <div className="text-xl font-bold text-yellow-600">
                          {uploadStats.parsingStats.mediumConfidence}
                        </div>
                        <div className="text-xs text-yellow-700 dark:text-yellow-300">Medium Confidence</div>
                      </div>
                    )}
                    {uploadStats.parsingStats.lowConfidence > 0 && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                        <div className="text-xl font-bold text-orange-600">
                          {uploadStats.parsingStats.lowConfidence}
                        </div>
                        <div className="text-xs text-orange-700 dark:text-orange-300">Low Confidence</div>
                      </div>
                    )}
                    {uploadStats.parsingStats.noMatch > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="text-xl font-bold text-gray-600">
                          {uploadStats.parsingStats.noMatch}
                        </div>
                        <div className="text-xs text-gray-700 dark:text-gray-400">No Match</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detection Results */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Detected Elements
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="text-xl font-bold text-blue-600">
                        {uploadStats.parsingStats.booksDetected}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Books</div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                      <div className="text-xl font-bold text-indigo-600">
                        {uploadStats.parsingStats.chaptersDetected}
                      </div>
                      <div className="text-xs text-indigo-700 dark:text-indigo-300">Chapters</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                      <div className="text-xl font-bold text-purple-600">
                        {uploadStats.parsingStats.versesDetected}
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-300">Verse Ranges</div>
                    </div>
                  </div>
                </div>

                {/* Parsing Quality Indicator */}
                {uploadStats.totalFiles > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Overall Detection Rate:</span>
                      <span className={`font-semibold ${
                        ((uploadStats.parsingStats.highConfidence + uploadStats.parsingStats.mediumConfidence) / uploadStats.totalFiles) >= 0.8
                          ? 'text-green-600'
                          : ((uploadStats.parsingStats.highConfidence + uploadStats.parsingStats.mediumConfidence) / uploadStats.totalFiles) >= 0.5
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {Math.round(((uploadStats.parsingStats.highConfidence + uploadStats.parsingStats.mediumConfidence) / uploadStats.totalFiles) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Select Audio Files</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              accept="audio/*"
              multiple={true}
              maxFiles={50}
              maxSize={500 * 1024 * 1024} // 500MB per file
              onFilesChange={handleFilesChange}
              allowedTypes={SUPPORTED_AUDIO_TYPES}
              uploadText="Drop audio files here or click to select"
              dragActiveText="Drop audio files here"
              showPreview={false}
              validateFile={validateAudioFile}
              className="min-h-[200px]"
            />

            {isProcessing && (
              <div className="mt-4 flex items-center justify-center">
                <LoadingSpinner className="mr-2" />
                <span className="text-gray-600">Processing audio files...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Summary */}
        {uploadStats.invalidFiles > 0 && (
          <Alert variant="error">
            <AlertTitle>File Validation Issues</AlertTitle>
            <AlertDescription>
              {uploadStats.invalidFiles} file(s) have validation errors. 
              Please review the file list below and fix any issues before uploading.
            </AlertDescription>
          </Alert>
        )}

        {/* File List */}
        {audioFiles.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Selected Files ({audioFiles.length})</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploadStats.validFiles === 0 || isUploading}
                  loading={isUploading}
                  loadingText="Uploading..."
                >
                  Upload Files ({uploadStats.validFiles})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {audioFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`p-4 border rounded-lg ${
                      file.uploadError 
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                        : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {file.name}
                            </h4>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <span>{formatFileSize(file.size)}</span>
                              {file.duration && (
                                <span>{formatDuration(file.duration)}</span>
                              )}
                              {file.filenameParseResult && file.filenameParseResult.confidence !== 'none' && (
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    file.filenameParseResult.confidence === 'high' 
                                      ? 'bg-green-100 text-green-800' 
                                      : file.filenameParseResult.confidence === 'medium'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {file.detectedBook} {file.detectedChapter}
                                    {file.verseRange && ` (v${file.verseRange})`}
                                  </span>
                                  <span className={`text-xs ${
                                    file.filenameParseResult.confidence === 'high' ? 'text-green-600' :
                                    file.filenameParseResult.confidence === 'medium' ? 'text-yellow-600' :
                                    'text-orange-600'
                                  }`}>
                                    {file.filenameParseResult.confidence}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Status indicator */}
                            {file.uploadStatus === 'success' && (
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                            {file.uploadStatus === 'uploading' && (
                              <div className="w-6 h-6">
                                <LoadingSpinner size="sm" />
                              </div>
                            )}
                            {file.uploadStatus === 'error' && (
                              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✗</span>
                              </div>
                            )}
                            
                            {/* Preview button */}
                            {!file.uploadError && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedFileForPreview(
                                  selectedFileForPreview === file.id ? null : file.id
                                )}
                              >
                                {selectedFileForPreview === file.id ? 'Hide' : 'Preview'}
                              </Button>
                            )}
                            
                            {/* Remove button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              disabled={file.uploadStatus === 'uploading'}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>

                        {/* Error message */}
                        {file.uploadError && (
                          <div className="mt-2 text-sm text-red-600">
                            {file.uploadError}
                          </div>
                        )}

                        {/* Upload progress */}
                        {file.uploadStatus === 'uploading' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                              <span>Uploading...</span>
                              <span>{file.uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                                style={{ width: `${file.uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Audio Preview */}
                    {selectedFileForPreview === file.id && !file.uploadError && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <AudioPlayer
                          src={URL.createObjectURL(file)}
                          title={file.name}
                          variant="compact"
                          size="sm"
                          showPlaybackSpeed={false}
                          showSkipButtons={false}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4">
              <div>
                <h4 className="font-medium">Supported Audio Formats:</h4>
                <p>MP3, WAV, M4A, AAC, OGG, WebM</p>
              </div>
              
              <div>
                <h4 className="font-medium">File Requirements:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Maximum file size: 500MB per file</li>
                  <li>Maximum 50 files per upload session</li>
                  <li>Files should be audio recordings of Bible chapters or verses</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">Filename Conventions for Automatic Detection:</h4>
                <div className="space-y-2 mt-2">
                  <div>
                    <span className="font-medium text-green-600">High Confidence Patterns:</span>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><code>Language_Book_Chapter_V1-5.mp3</code> - Full format with verse range</li>
                      <li><code>Book_Chapter_Verses1-3.mp3</code> - Book, chapter, and verses</li>
                      <li><code>EN_Matthew_5_V1-12.mp3</code> - Language code included</li>
                    </ul>
                  </div>
                  
                  <div>
                    <span className="font-medium text-yellow-600">Medium Confidence Patterns:</span>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><code>Matthew_Chapter5.mp3</code> - Book and chapter</li>
                      <li><code>EN_Genesis_1.mp3</code> - Language, book, chapter</li>
                      <li><code>John_3.mp3</code> - Simple book and chapter</li>
                    </ul>
                  </div>
                  
                  <div>
                    <span className="font-medium text-orange-600">Low Confidence Patterns:</span>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><code>Matthew.mp3</code> - Book name only</li>
                      <li><code>Genesis_Recording.mp3</code> - Book with additional text</li>
                    </ul>
                  </div>
                  
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-blue-800 dark:text-blue-200">
                      <strong>Tip:</strong> Use abbreviations like GEN, MAT, JOH, or full names like Genesis, Matthew, John. 
                      The system recognizes both standard 3-letter codes and full book names.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 