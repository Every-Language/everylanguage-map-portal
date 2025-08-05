import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Checkbox,
  Input,
  Select,
  SelectItem,
  LoadingSpinner
} from '@/shared/design-system/components';
import { useMediaFilesByProject } from '@/shared/hooks/query/media-files';
import { useSelectedProject } from '@/features/dashboard/hooks/useSelectedProject';
import { useUpdateMediaFileCheckStatus } from '@/shared/hooks/query/verse-feedback';
import { useAudioVersionsByProject } from '@/shared/hooks/query/audio-versions';
import { useBooks } from '@/shared/hooks/query/bible-structure';
import { useChaptersByBook } from '@/shared/hooks/query/bible-structure';
import type { MediaFileWithVerseInfo } from '@/shared/hooks/query/media-files';
import { 
  CheckCircleIcon, 
  ClockIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface CommunityCheckTableProps {
  onStartChecking: (file: MediaFileWithVerseInfo) => void;
  selectedFileId?: string;
  compact?: boolean;
}

// Helper function to get check status colors and icons
const getCheckStatusStyling = (status: string | null) => {
  switch (status) {
    case 'approved':
      return {
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
        icon: CheckCircleIcon,
        label: 'Approved'
      };
    case 'rejected':
      return {
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
        icon: XCircleIcon,
        label: 'Rejected'
      };
    case 'requires_review':
      return {
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        icon: ExclamationTriangleIcon,
        label: 'Requires Review'
      };
    default:
      return {
        color: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-100 dark:bg-gray-700',
        icon: ClockIcon,
        label: 'Pending'
      };
  }
};

export function CommunityCheckTable({ onStartChecking, selectedFileId, compact = false }: CommunityCheckTableProps) {
  const { selectedProject } = useSelectedProject();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedAudioVersion, setSelectedAudioVersion] = useState('all');
  const [selectedBook, setSelectedBook] = useState('all');
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [selectedCheckStatus, setSelectedCheckStatus] = useState('pending');
  
  // Fetch data
  const { data: audioVersions = [], isLoading: audioVersionsLoading } = useAudioVersionsByProject(
    selectedProject?.id || ''
  );
  const { data: books = [], isLoading: booksLoading } = useBooks();
  const { data: chapters = [] } = useChaptersByBook(
    selectedBook !== 'all' ? selectedBook : null
  );

  // Fetch all media files
  const { data: allMediaFiles, isLoading, error } = useMediaFilesByProject(
    selectedProject?.id || null
  );

  const updateCheckStatusMutation = useUpdateMediaFileCheckStatus();

  // Filter files
  const filteredFiles = allMediaFiles?.filter(file => {
    const matchesCheckStatus = selectedCheckStatus === 'all' || file.check_status === selectedCheckStatus;
    const matchesUploadStatus = file.upload_status === 'completed';
    const matchesSearch = !searchText || 
      file.verse_reference?.toLowerCase().includes(searchText.toLowerCase());
    const matchesAudioVersion = selectedAudioVersion === 'all' || file.audio_version_id === selectedAudioVersion;
    const matchesBook = selectedBook === 'all' || file.book_id === selectedBook;
    const matchesChapter = selectedChapter === 'all' || file.chapter_id === selectedChapter;
    
    return matchesCheckStatus && matchesUploadStatus && matchesSearch && matchesAudioVersion && matchesBook && matchesChapter;
  }) || [];

  const handleBulkPublish = async () => {
    try {
      await Promise.all(
        selectedFiles.map(fileId =>
          updateCheckStatusMutation.mutateAsync({
            mediaFileId: fileId,
            newStatus: 'approved'
          })
        )
      );
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error bulk publishing files:', error);
    }
  };

  const handleSelectFile = (e: React.MouseEvent, fileId: string, checked: boolean) => {
    e.stopPropagation(); // Prevent row click
    if (checked) {
      setSelectedFiles([...selectedFiles, fileId]);
    } else {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(filteredFiles.map(file => file.id));
    } else {
      setSelectedFiles([]);
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  if (isLoading || audioVersionsLoading || booksLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="md" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading files...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-center text-red-600 p-8">
            Error loading files: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={compact ? "text-base" : undefined}>
            Files for Review ({filteredFiles.length})
          </CardTitle>
          
          {/* Search Bar */}
          {!compact && (
            <div className="w-64">
              <Input
                placeholder="Search by verse reference..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Filters */}
        {!compact && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            {/* Audio Version Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Audio Version
              </label>
              <Select value={selectedAudioVersion} onValueChange={setSelectedAudioVersion}>
                <SelectItem value="all">All Versions</SelectItem>
                {audioVersions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {version.name}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Book Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Book
              </label>
              <Select value={selectedBook} onValueChange={(value) => {
                setSelectedBook(value);
                setSelectedChapter('all'); // Reset chapter when book changes
              }}>
                <SelectItem value="all">All Books</SelectItem>
                {books.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.name}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Chapter Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chapter
              </label>
              <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={selectedBook === 'all'}>
                <SelectItem value="all">All Chapters</SelectItem>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    Chapter {chapter.chapter_number}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Check Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check Status
              </label>
              <Select value={selectedCheckStatus} onValueChange={setSelectedCheckStatus}>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="requires_review">Requires Review</SelectItem>
              </Select>
            </div>

            {/* Search in compact mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <Input
                placeholder="Search verses..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No files found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchText || selectedAudioVersion !== 'all' || selectedBook !== 'all' || selectedChapter !== 'all' || selectedCheckStatus !== 'all'
                ? 'No files match your current filters.' 
                : 'No files available for community check.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bulk operations */}
            {selectedFiles.length > 0 && (
              <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-200 dark:border-primary-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleBulkPublish}
                      disabled={updateCheckStatusMutation.isPending}
                      className="flex items-center space-x-1"
                    >
                      <PlayIcon className="h-4 w-4" />
                      <span>Bulk Approve</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100 w-12">
                      <div className="flex items-center">
                        <Checkbox
                          checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      Verse Reference
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      Version
                    </th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                      Check Status
                    </th>
                    {!compact && (
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100 w-24">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => {
                    const checkStatusStyling = getCheckStatusStyling(file.check_status);
                    const StatusIcon = checkStatusStyling.icon;
                    const audioVersion = audioVersions.find(v => v.id === file.audio_version_id);
                    const isSelected = selectedFileId === file.id;

                    return (
                      <tr 
                        key={file.id} 
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700' : ''
                        }`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={(checked) => {
                              const syntheticEvent = new MouseEvent('click', { bubbles: true });
                              handleSelectFile(syntheticEvent as unknown as React.MouseEvent, file.id, checked as boolean);
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {file.verse_reference}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {audioVersion?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${checkStatusStyling.bg} ${checkStatusStyling.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {checkStatusStyling.label}
                          </div>
                        </td>
                        {!compact && (
                          <td className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onStartChecking(file)}
                              className="flex items-center space-x-1"
                              title="Play audio"
                            >
                              <PlayIcon className="h-4 w-4" />
                              <span>Play</span>
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 