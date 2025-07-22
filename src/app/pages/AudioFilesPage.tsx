import React, { useState, useMemo } from 'react';
import { useSelectedProject } from '../../features/dashboard/hooks/useSelectedProject';
import { 
  useMediaFilesByProject, 
  useUpdateMediaFile, 
  useBatchUpdateMediaFileStatus,
  useBatchUpdateMediaFilePublishStatus,
  useSoftDeleteMediaFiles,
  type MediaFileWithVerseInfo
} from '../../shared/hooks/query/media-files';
import { 
  useAudioVersionsByProject, 
  useCreateAudioVersion 
} from '../../shared/hooks/query/audio-versions';
import { useBibleVersions } from '../../shared/hooks/query/bible-versions';
import { useAuth } from '../../features/auth/hooks/useAuth';
import {
  useBooks, 
  useChaptersByBook, 
  useVersesByChapter
} from '../../shared/hooks/query/bible-structure';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Button,
  Checkbox,
  LoadingSpinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectItem,
  SearchableSelect,
  Alert,
  Progress,
  AudioPlayer
} from '../../shared/design-system';
import { useToast } from '../../shared/design-system/hooks/useToast';
import { AudioUploadModal, UploadProgressDisplay } from '../../features/upload/components';
import { useDownload } from '../../shared/hooks/useDownload';
import { PlusIcon, ArrowDownTrayIcon, PlayIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Type for publish status options
type PublishStatus = 'pending' | 'published' | 'archived';

interface Filters {
  audioVersionId: string;
  publishStatus: string;
  uploadStatus: string;
  searchText: string;
  bookId: string;
  chapterId: string;
}

// MediaFileWithVerseInfo is now imported from media-files.ts

export const AudioFilesPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  const { downloadState, downloadFile, clearError } = useDownload();
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [filters, setFilters] = useState<Filters>({
    audioVersionId: 'all',
    publishStatus: 'all',
    uploadStatus: 'all',
    searchText: '',
    bookId: 'all',
    chapterId: 'all'
  });
  
  const [sortField, setSortField] = useState<'filename' | 'publish_status' | 'upload_status' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMediaFile, setEditingMediaFile] = useState<MediaFileWithVerseInfo | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [currentAudioFile, setCurrentAudioFile] = useState<MediaFileWithVerseInfo | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Audio version creation state
  const [showCreateAudioVersionModal, setShowCreateAudioVersionModal] = useState(false);
  const [newAudioVersionName, setNewAudioVersionName] = useState('');
  const [selectedBibleVersion, setSelectedBibleVersion] = useState<string>('');
  const [isCreatingAudioVersion, setIsCreatingAudioVersion] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    bookId: '', // Will need to derive from verse info
    chapterId: '', // Will need to derive from verse info
    startVerseId: '',
    endVerseId: '',
    publishStatus: 'pending' as PublishStatus
  });

  // Data fetching
  const { data: mediaFiles, isLoading, error, refetch } = useMediaFilesByProject(selectedProject?.id || null);
  const { data: audioVersions, isLoading: audioVersionsLoading, refetch: refetchAudioVersions } = useAudioVersionsByProject(selectedProject?.id || '');
  const { data: bibleVersions } = useBibleVersions();
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: chapters, isLoading: chaptersLoading } = useChaptersByBook(filters.bookId !== 'all' ? filters.bookId : null);
  const { data: chapterVerses } = useVersesByChapter(editForm.chapterId || null);

  // Mutations
  const updateMediaFile = useUpdateMediaFile();
  const batchUpdateStatus = useBatchUpdateMediaFileStatus();
  const batchUpdatePublishStatus = useBatchUpdateMediaFilePublishStatus();
  const softDeleteFiles = useSoftDeleteMediaFiles();
  const createAudioVersionMutation = useCreateAudioVersion();

  // Media files are already enhanced with verse information from the hook
  const enhancedMediaFiles = mediaFiles || [];

  // Filter and sort media files
  const filteredAndSortedFiles = useMemo(() => {
    if (!enhancedMediaFiles || !selectedProject) return [];
    
    const filtered = enhancedMediaFiles.filter((file: MediaFileWithVerseInfo) => {
      // Filter by audio version
      const matchesAudioVersion = filters.audioVersionId === 'all' || file.audio_version_id === filters.audioVersionId;
      
      // Filter by publish status
      const matchesPublishStatus = filters.publishStatus === 'all' || (file.publish_status || 'pending') === filters.publishStatus;
      
      // Filter by upload status
      const matchesUploadStatus = filters.uploadStatus === 'all' || (file.upload_status || 'pending') === filters.uploadStatus;
      
      // Filter by book
      const matchesBook = filters.bookId === 'all' || file.book_id === filters.bookId;
      
      // Filter by chapter
      const matchesChapter = filters.chapterId === 'all' || file.chapter_id === filters.chapterId;
      
      // Filter by search text in filename or verse reference
      const matchesSearch = !filters.searchText || 
        file.filename?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        file.verse_reference?.toLowerCase().includes(filters.searchText.toLowerCase());
        
      return matchesAudioVersion && matchesPublishStatus && matchesUploadStatus && matchesBook && matchesChapter && matchesSearch;
    });
    
    // Sort the filtered results
    filtered.sort((a: MediaFileWithVerseInfo, b: MediaFileWithVerseInfo) => {
      let comparison = 0;
      
      if (sortField === 'filename') {
        comparison = (a.filename || '').localeCompare(b.filename || '');
      } else if (sortField === 'publish_status') {
        const statusA = a.publish_status || 'pending';
        const statusB = b.publish_status || 'pending';
        comparison = statusA.localeCompare(statusB);
      } else if (sortField === 'upload_status') {
        const statusA = a.upload_status || 'pending';
        const statusB = b.upload_status || 'pending';
        comparison = statusA.localeCompare(statusB);
      } else if (sortField === 'created_at') {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        comparison = dateA - dateB;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [enhancedMediaFiles, selectedProject, filters, sortField, sortDirection]);

  // Handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Reset chapter when book changes
      if (key === 'bookId') {
        newFilters.chapterId = 'all';
      }
      
      return newFilters;
    });
    setSelectedFiles([]); // Clear selections when filtering
  };

  const handleSort = (field: 'filename' | 'publish_status' | 'upload_status' | 'created_at') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleUploadComplete = () => {
    refetch();
  };

  // Audio version creation
  const handleCreateAudioVersion = async () => {
    if (!selectedProject || !newAudioVersionName.trim() || !selectedBibleVersion || !dbUser) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'error'
      });
      return;
    }

    setIsCreatingAudioVersion(true);

    try {
      const targetLanguageEntityId = selectedProject.target_language_entity_id;
      
      if (!targetLanguageEntityId) {
        toast({
          title: 'Project configuration error',
          description: 'Project does not have a target language configured',
          variant: 'error'
        });
        setIsCreatingAudioVersion(false);
        return;
      }

      await createAudioVersionMutation.mutateAsync({
        name: newAudioVersionName.trim(),
        language_entity_id: targetLanguageEntityId,
        bible_version_id: selectedBibleVersion,
        project_id: selectedProject.id,
        created_by: dbUser.id
      });

      toast({
        title: 'Audio version created',
        description: `Successfully created audio version "${newAudioVersionName}"`,
        variant: 'success'
      });

      // Reset form and refresh data
      setNewAudioVersionName('');
      setSelectedBibleVersion('');
      setShowCreateAudioVersionModal(false);
      await refetchAudioVersions();
      setIsCreatingAudioVersion(false);
    } catch (error: unknown) {
      console.error('Error creating audio version:', error);
      toast({
        title: 'Failed to create audio version',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error'
      });
      setIsCreatingAudioVersion(false);
    }
  };

  // Individual publish status change
  const handlePublishStatusChange = async (fileId: string, newStatus: PublishStatus) => {
    try {
      await updateMediaFile.mutateAsync({
        id: fileId,
        updates: { publish_status: newStatus }
      });
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  };

  // Selection logic for bulk operations
  const allCurrentPageSelected = filteredAndSortedFiles.length > 0 && 
    filteredAndSortedFiles.every(file => selectedFiles.includes(file.id));
  const someCurrentPageSelected = filteredAndSortedFiles.some(file => selectedFiles.includes(file.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = filteredAndSortedFiles.map(file => file.id);
      setSelectedFiles(prev => [...new Set([...prev, ...currentPageIds])]);
    } else {
      const currentPageIds = new Set(filteredAndSortedFiles.map(file => file.id));
      setSelectedFiles(prev => prev.filter(id => !currentPageIds.has(id)));
    }
  };

  const handleRowSelect = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  // Bulk operations
  const handleBulkPublishStatusChange = async (status: 'pending' | 'published' | 'archived') => {
    if (selectedFiles.length === 0) return;
    
    try {
      await batchUpdatePublishStatus.mutateAsync({
        fileIds: selectedFiles,
        status
      });
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.length === 0) return;
    
    const filesToDownload = enhancedMediaFiles.filter(file => 
      selectedFiles.includes(file.id)
    );
    
    // Download files one by one
    for (const file of filesToDownload) {
      try {
        await downloadFile(file);
      } catch (error) {
        console.error(`Failed to download ${file.filename}:`, error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedFiles.length} files? This action can be undone.`)) {
      return;
    }
    
    try {
      await softDeleteFiles.mutateAsync({
        fileIds: selectedFiles
      });
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error deleting files:', error);
    }
  };

  // Edit functions
  const handleEditClick = (file: MediaFileWithVerseInfo) => {
    setEditingMediaFile(file);
    setEditForm({
      bookId: file.book_id || '',
      chapterId: file.chapter_id || '',
      startVerseId: file.start_verse_id || '',
      endVerseId: file.end_verse_id || '',
      publishStatus: file.publish_status || 'pending'
    });
    setShowEditModal(true);
  };

  // Handle cascading selection in edit modal
  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // Reset dependent fields when parent changes
      if (field === 'bookId') {
        newForm.chapterId = '';
        newForm.startVerseId = '';
        newForm.endVerseId = '';
      } else if (field === 'chapterId') {
        newForm.startVerseId = '';
        newForm.endVerseId = '';
      }
      
      return newForm;
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMediaFile) return;
    
    try {
      await updateMediaFile.mutateAsync({
        id: editingMediaFile.id,
        updates: {
          start_verse_id: editForm.startVerseId || null,
          end_verse_id: editForm.endVerseId || null,
          publish_status: editForm.publishStatus
        }
      });
      setShowEditModal(false);
      refetch();
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  };

  // Download function
  const handleDownload = async (file: MediaFileWithVerseInfo) => {
    await downloadFile(file);
  };

  // Play function
  const handlePlay = async (file: MediaFileWithVerseInfo) => {
    if (!file.remote_path) {
      console.error('No remote path available for file');
      return;
    }

    try {
      setCurrentAudioFile(file);
      
      // Get presigned URL for streaming
      const downloadService = await import('../../shared/services/downloadService');
      const service = new downloadService.DownloadService();
      const result = await service.getDownloadUrls([file.remote_path]);
      
      if (result.success && result.urls[file.remote_path]) {
        setAudioUrl(result.urls[file.remote_path]);
        setShowAudioPlayer(true);
      } else {
        console.error('Failed to get streaming URL');
      }
    } catch (error) {
      console.error('Error getting audio URL:', error);
    }
  };

  // Individual delete function
  const handleDelete = async (file: MediaFileWithVerseInfo) => {
    if (!confirm(`Are you sure you want to delete "${file.filename}"? This action can be undone.`)) {
      return;
    }
    
    try {
      await softDeleteFiles.mutateAsync({
        fileIds: [file.id]
      });
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  // Status badge colors
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'uploading': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Truncate filename helper
  const truncateFilename = (filename: string, maxLength: number = 30) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4) + '...';
    return `${truncatedName}.${extension}`;
  };

  if (!selectedProject) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Project Selected
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please select a project to view audio files.
          </p>
        </div>
      </div>
    );
  }

  const isLoading_ = isLoading || booksLoading || chaptersLoading || audioVersionsLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Audio Files
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage audio files for {selectedProject.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={() => setShowCreateAudioVersionModal(true)}
            disabled={!user || !dbUser}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Audio Version
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Upload Audio
          </Button>
        </div>
      </div>

      {/* Upload Progress Display */}
      <UploadProgressDisplay />

      {/* Download Error Alert */}
      {downloadState.error && (
        <Alert variant="destructive" className="mb-4">
          <div className="flex justify-between items-center">
            <span>{downloadState.error}</span>
            <Button variant="outline" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {/* Download Progress */}
      {downloadState.isDownloading && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Downloading...</span>
              <span className="text-sm text-gray-500">{Math.round(downloadState.progress)}%</span>
            </div>
            <Progress value={downloadState.progress} className="w-full" />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Audio Version</label>
              <Select 
                value={filters.audioVersionId} 
                onValueChange={(value) => handleFilterChange('audioVersionId', value)}
              >
                <SelectItem value="all">All Versions</SelectItem>
                {audioVersions?.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {version.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Publish Status</label>
              <Select 
                value={filters.publishStatus} 
                onValueChange={(value) => handleFilterChange('publishStatus', value)}
              >
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Upload Status</label>
              <Select 
                value={filters.uploadStatus} 
                onValueChange={(value) => handleFilterChange('uploadStatus', value)}
              >
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="uploading">Uploading</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Book</label>
              <Select 
                value={filters.bookId} 
                onValueChange={(value) => handleFilterChange('bookId', value)}
              >
                <SelectItem value="all">All Books</SelectItem>
                {books?.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Chapter</label>
              <Select 
                value={filters.chapterId} 
                onValueChange={(value) => handleFilterChange('chapterId', value)}
                disabled={filters.bookId === 'all'}
              >
                <SelectItem value="all">All Chapters</SelectItem>
                {chapters?.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    Chapter {chapter.chapter_number}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Search</label>
              <Input
                placeholder="Search by filename or verse reference..."
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFiles([])}
                >
                  Clear Selection
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 flex-wrap">
                {/* Publish Status Actions */}
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkPublishStatusChange('pending')}
                    disabled={batchUpdatePublishStatus.isPending}
                  >
                    Mark Pending
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkPublishStatusChange('published')}
                    disabled={batchUpdatePublishStatus.isPending}
                  >
                    Publish
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkPublishStatusChange('archived')}
                    disabled={batchUpdatePublishStatus.isPending}
                  >
                    Archive
                  </Button>
                </div>
                
                {/* Other Bulk Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDownload}
                  disabled={downloadState.isDownloading}
                >
                  {downloadState.isDownloading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  Download All
                </Button>
                
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={softDeleteFiles.isPending}
                >
                  {softDeleteFiles.isPending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Files ({filteredAndSortedFiles.length} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading_ ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading audio files...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 dark:text-red-400 mb-4">Failed to load audio files</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : filteredAndSortedFiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No audio files found</p>
              <Button onClick={() => setShowUploadModal(true)}>
                Upload Your First Audio File
              </Button>
            </div>
          ) : (
            <div className="space-y-4 relative">
              {/* Floating Bulk Operations */}
              {selectedFiles.length > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-blue-50 dark:bg-blue-900/90 border border-blue-200 dark:border-blue-700 rounded-full px-4 py-3 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                    </span>
                    <Select 
                      value="bulk-action" 
                      onValueChange={(value) => {
                        if (value !== 'bulk-action') {
                          batchUpdateStatus.mutate({
                            fileIds: selectedFiles,
                            status: value as 'pending' | 'approved' | 'rejected' // Note: This is for check_status, you may need a different mutation for publish_status
                          });
                          setSelectedFiles([]);
                        }
                      }}
                    >
                      <SelectItem value="bulk-action">Change Status</SelectItem>
                      <SelectItem value="pending">Set to Pending</SelectItem>
                      <SelectItem value="approved">Set to Approved</SelectItem>
                      <SelectItem value="rejected">Set to Rejected</SelectItem>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedFiles([])}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-800"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                        <div className="flex items-center">
                          <Checkbox
                            checked={allCurrentPageSelected}
                            onCheckedChange={handleSelectAll}
                          />
                          {someCurrentPageSelected && !allCurrentPageSelected && (
                            <div className="absolute w-4 h-4 bg-primary-600 rounded-sm flex items-center justify-center">
                              <div className="w-2 h-0.5 bg-white rounded"></div>
                            </div>
                          )}
                        </div>
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Verse Reference</th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => handleSort('filename')}
                          className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <span>Filename</span>
                          {sortField === 'filename' && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => handleSort('upload_status')}
                          className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <span>Upload Status</span>
                          {sortField === 'upload_status' && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => handleSort('publish_status')}
                          className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <span>Publish Status</span>
                          {sortField === 'publish_status' && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedFiles.map((file: MediaFileWithVerseInfo) => (
                      <tr key={file.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={(checked) => handleRowSelect(file.id, checked as boolean)}
                          />
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {file.verse_reference}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="max-w-xs">
                            <p className="text-sm text-gray-900 dark:text-gray-100" title={file.filename}>
                              {truncateFilename(file.filename || 'Unknown')}
                            </p>
                            {file.duration_seconds && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {Math.floor(file.duration_seconds / 60)}:{(file.duration_seconds % 60).toString().padStart(2, '0')}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(file.upload_status)}`}>
                            {file.upload_status || 'unknown'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <Select 
                              value={file.publish_status || 'pending'} 
                              onValueChange={(value) => handlePublishStatusChange(file.id, value as PublishStatus)}
                            >
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </Select>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlay(file)}
                              disabled={!file.remote_path}
                              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
                              title="Play audio"
                            >
                              <PlayIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(file)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(file)}
                              disabled={downloadState.isDownloading && downloadState.downloadingFileId === file.id}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                              title="Download"
                            >
                              {downloadState.isDownloading && downloadState.downloadingFileId === file.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <ArrowDownTrayIcon className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(file)}
                              disabled={softDeleteFiles.isPending}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                              title="Delete"
                            >
                              {softDeleteFiles.isPending ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <AudioUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadComplete={handleUploadComplete}
      />

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Edit Audio File</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Book, Chapter, Verses
              </label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Book</label>
                  <SearchableSelect 
                    options={books?.map(book => ({ value: book.id, label: book.name })) || []}
                    value={editForm.bookId} 
                    onValueChange={(value) => handleEditFormChange('bookId', value)}
                    placeholder="Select Book"
                    searchPlaceholder="Search books..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Chapter</label>
                  <SearchableSelect 
                    options={chapters?.filter(c => c.book_id === editForm.bookId).map(chapter => ({ value: chapter.id, label: `Chapter ${chapter.chapter_number}` })) || []}
                    value={editForm.chapterId} 
                    onValueChange={(value) => handleEditFormChange('chapterId', value)}
                    disabled={!editForm.bookId}
                    placeholder="Select Chapter"
                    searchPlaceholder="Search chapters..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Verse</label>
                  <SearchableSelect 
                    options={chapterVerses?.map(verse => ({ value: verse.id, label: `Verse ${verse.verse_number}` })) || []}
                    value={editForm.startVerseId} 
                    onValueChange={(value) => handleEditFormChange('startVerseId', value)}
                    disabled={!editForm.chapterId}
                    placeholder="Start Verse"
                    searchPlaceholder="Search verses..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Verse</label>
                  <SearchableSelect 
                    options={chapterVerses?.map(verse => ({ value: verse.id, label: `Verse ${verse.verse_number}` })) || []}
                    value={editForm.endVerseId} 
                    onValueChange={(value) => handleEditFormChange('endVerseId', value)}
                    disabled={!editForm.chapterId}
                    placeholder="End Verse"
                    searchPlaceholder="Search verses..."
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Publish Status
              </label>
              <Select value={editForm.publishStatus} onValueChange={(value) => handleEditFormChange('publishStatus', value)}>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMediaFile.isPending}>
              {updateMediaFile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Audio Version Modal */}
      <Dialog open={showCreateAudioVersionModal} onOpenChange={setShowCreateAudioVersionModal}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Create New Audio Version</DialogTitle>
            <DialogDescription>
              Create a new audio version to organize different recordings or translations
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Audio Version Name *
              </label>
              <Input
                type="text"
                placeholder="e.g., Main Recording, Youth Version, Dramatized..."
                value={newAudioVersionName}
                onChange={(e) => setNewAudioVersionName(e.target.value)}
                disabled={isCreatingAudioVersion}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Bible Version *
              </label>
              <Select 
                value={selectedBibleVersion} 
                onValueChange={setSelectedBibleVersion}
                placeholder="Select a Bible version..."
                disabled={isCreatingAudioVersion}
              >
                {bibleVersions?.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {version.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateAudioVersionModal(false);
                setNewAudioVersionName('');
                setSelectedBibleVersion('');
              }}
              disabled={isCreatingAudioVersion}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAudioVersion}
              disabled={!newAudioVersionName.trim() || !selectedBibleVersion || isCreatingAudioVersion}
            >
              {isCreatingAudioVersion ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Audio Version'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audio Player Modal */}
      <AudioPlayer
        open={showAudioPlayer}
        onOpenChange={setShowAudioPlayer}
        audioUrl={audioUrl || undefined}
        title={currentAudioFile?.filename || 'Audio Player'}
        subtitle={currentAudioFile?.verse_reference}
      />
    </div>
  );
}; 