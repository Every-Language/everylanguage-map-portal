import { useMemo, useState } from 'react';
import { 
  useMediaFilesByProject, 
  useUpdateMediaFileStatus, 
  useBatchUpdateMediaFileStatus,
  type MediaFile 
} from '../../../shared/hooks/query/media-files';
import { useDataTableState, type DataTableFilters } from '../../../shared/hooks/useDataTableState';
import { useBulkOperations } from '../../../shared/hooks/useBulkOperations';

// Types
export interface MediaFileWithRelations extends MediaFile {
  books?: { name: string };
  chapters?: { chapter_number: number };
  users?: { display_name?: string; email: string };
}

export type CheckStatus = 'pending' | 'approved' | 'rejected' | 'requires_review';

interface CheckingFilters extends DataTableFilters {
  assignedTo: string;
  bookName: string;
  sortBy: 'created_at' | 'updated_at' | 'filename';
  sortOrder: 'asc' | 'desc';
}

export interface UseCommunityCheckingProps {
  projectId: string;
}

export interface UseCommunityCheckingReturn {
  // Data
  allMediaFiles: MediaFileWithRelations[] | undefined;
  pendingCheckFiles: MediaFileWithRelations[];
  sortedFiles: MediaFileWithRelations[];
  availableAssignees: Array<{ display_name?: string; email: string }>;
  isLoading: boolean;
  
  // Statistics
  stats: {
    totalFiles: number;
    pendingCount: number;
    selectedCount: number;
  };
  
  // Filter state
  filters: CheckingFilters;
  handleFilterChange: (key: string, value: string) => void;
  
  // Selection state
  selectedFiles: Set<string>;
  handleFileSelect: (fileId: string, checked: boolean) => void;
  handleSelectAll: (checked: boolean) => void;
  clearSelection: () => void;
  
  // Batch operations
  batchStatus: CheckStatus;
  setBatchStatus: (status: CheckStatus) => void;
  handleBatchStatusUpdate: () => void;
  canPerformBatchUpdate: boolean;
  
  // Individual file operations
  handleSingleFileStatus: (fileId: string, status: CheckStatus) => void;
  
  // Mutations
  updateStatusMutation: ReturnType<typeof useUpdateMediaFileStatus>;
  batchUpdateMutation: ReturnType<typeof useBatchUpdateMediaFileStatus>;
}

export function useCommunityChecking({ projectId }: UseCommunityCheckingProps): UseCommunityCheckingReturn {
  // Data fetching
  const { data: allMediaFiles, isLoading } = useMediaFilesByProject(projectId);
  
  // Filter and sort state management
  const dataTable = useDataTableState({
    initialFilters: {
      assignedTo: '',
      bookName: '',
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  });
  
  // Filter to only pending check files
  const pendingCheckFiles = useMemo(() => {
    if (!allMediaFiles) return [];
    
    return allMediaFiles.filter((file: MediaFileWithRelations) => {
      const isUploaded = file.upload_status === 'completed';
      const isPendingCheck = file.check_status === 'pending';
      
      // Apply additional filters
      const filters = dataTable.filters as unknown as CheckingFilters;
      const matchesAssignee = !filters.assignedTo || 
        file.users?.email === filters.assignedTo;
      const matchesBook = !filters.bookName || 
        (file.books?.name && file.books.name.toLowerCase().includes(filters.bookName.toLowerCase()));
      
      return isUploaded && isPendingCheck && matchesAssignee && matchesBook;
    });
  }, [allMediaFiles, dataTable.filters]);
  
  // Sort files
  const sortedFiles = useMemo(() => {
    const filters = dataTable.filters as unknown as CheckingFilters;
    const sorted = [...pendingCheckFiles].sort((a: MediaFileWithRelations, b: MediaFileWithRelations) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'created_at': {
          comparison = new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
          break;
        }
        case 'updated_at': {
          comparison = new Date(a.updated_at || '').getTime() - new Date(b.updated_at || '').getTime();
          break;
        }
        case 'filename': {
          const aFilename = a.remote_path?.split('/').pop() || a.local_path || '';
          const bFilename = b.remote_path?.split('/').pop() || b.local_path || '';
          comparison = aFilename.localeCompare(bFilename);
          break;
        }
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [pendingCheckFiles, dataTable.filters]);
  
  // Mutations
  const updateStatusMutation = useUpdateMediaFileStatus();
  const batchUpdateMutation = useBatchUpdateMediaFileStatus();
  
  // Bulk operations for file selection
  const bulkOps = useBulkOperations(sortedFiles, {
    getId: (file) => file.id,
    operations: [
      {
        id: 'approve',
        label: 'Approve Selected',
        handler: async (fileIds: string[]) => {
          await batchUpdateMutation.mutateAsync({ 
            fileIds, 
            status: 'approved' as CheckStatus 
          });
        }
      },
      {
        id: 'reject',
        label: 'Reject Selected',
        handler: async (fileIds: string[]) => {
          await batchUpdateMutation.mutateAsync({ 
            fileIds, 
            status: 'rejected' as CheckStatus 
          });
        }
      },
      {
        id: 'review',
        label: 'Mark for Review',
        handler: async (fileIds: string[]) => {
          await batchUpdateMutation.mutateAsync({ 
            fileIds, 
            status: 'requires_review' as CheckStatus 
          });
        }
      }
    ]
  });
  
  // Available assignees for filters
  const availableAssignees = useMemo(() => {
    if (!allMediaFiles) return [];
    
    const assignees = allMediaFiles
      .map((file: MediaFileWithRelations) => file.users)
      .filter((user): user is { display_name?: string; email: string } => !!user && !!user.email)
      .filter((user, index, self) => 
        self.findIndex(u => u.email === user.email) === index
      );
    
    return assignees;
  }, [allMediaFiles]);
  
  // Statistics
  const stats = useMemo(() => ({
    totalFiles: allMediaFiles?.length || 0,
    pendingCount: pendingCheckFiles.length,
    selectedCount: bulkOps.selectedItems.size
  }), [allMediaFiles?.length, pendingCheckFiles.length, bulkOps.selectedItems.size]);
  
  // Event handlers
  const handleFilterChange = (key: string, value: string) => {
    dataTable.handleFilterChange(key, value);
    // Clear selection when filters change
    bulkOps.clearSelection();
  };
  
  const handleSingleFileStatus = (fileId: string, status: CheckStatus) => {
    updateStatusMutation.mutate({ fileId, status });
  };
  
  // Custom batch operations with status
  const [batchStatus, setBatchStatus] = useState<CheckStatus>('approved');
  
  const handleBatchStatusUpdate = () => {
    if (bulkOps.selectedItems.size === 0) return;
    
    batchUpdateMutation.mutate({ 
      fileIds: Array.from(bulkOps.selectedItems), 
      status: batchStatus 
    });
    bulkOps.clearSelection();
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      bulkOps.selectAll(sortedFiles);
    } else {
      bulkOps.clearSelection();
    }
  };
  
  return {
    // Data
    allMediaFiles,
    pendingCheckFiles,
    sortedFiles,
    availableAssignees,
    isLoading,
    
    // Statistics  
    stats,
    
    // Filter state
    filters: dataTable.filters as unknown as CheckingFilters,
    handleFilterChange,
    
    // Selection state
    selectedFiles: bulkOps.selectedItems,
    handleFileSelect: bulkOps.selectItem,
    handleSelectAll,
    clearSelection: bulkOps.clearSelection,
    
    // Batch operations
    batchStatus,
    setBatchStatus,
    handleBatchStatusUpdate,
    canPerformBatchUpdate: bulkOps.selectedItems.size > 0,
    
    // Individual file operations
    handleSingleFileStatus,
    
    // Mutations
    updateStatusMutation,
    batchUpdateMutation
  };
} 