import React from 'react';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { useCommunityChecking, type CheckStatus } from '../../hooks/useCommunityChecking';

export interface CheckingWorkflowProps {
  projectId: string;
  projectName: string;
}

export const CheckingWorkflow: React.FC<CheckingWorkflowProps> = ({
  projectId,
  projectName
}) => {
  const communityChecking = useCommunityChecking({ projectId });

  const {
    sortedFiles,
    isLoading,
    stats,
    selectedFiles,
    canPerformBatchUpdate,
    filters,
    handleFilterChange,
    availableAssignees,
    handleFileSelect,
    handleSelectAll,
    handleSingleFileStatus,
    batchStatus,
    setBatchStatus,
    handleBatchStatusUpdate
  } = communityChecking;

  // Statistics display
  const statsSection = (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
            <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Pending Review
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {isLoading ? '-' : stats.pendingCount}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Selected Files
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {stats.selectedCount}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Total Audio Files
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {isLoading ? '-' : stats.totalFiles}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Your Role
            </p>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Community Checker
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Combined filters and batch actions
  const filtersSection = (
    <div className="space-y-4">
      {/* Statistics */}
      {statsSection}
      
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Assigned To
          </label>
          <select
            value={filters.assignedTo}
            onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value="">All assignees</option>
            {availableAssignees.map((assignee) => (
              <option key={assignee.email} value={assignee.email}>
                {assignee.display_name || assignee.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Book Filter
          </label>
          <input
            type="text"
            placeholder="Search books..."
            value={filters.bookName}
            onChange={(e) => handleFilterChange('bookName', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value="created_at">Upload Date</option>
            <option value="updated_at">Last Modified</option>
            <option value="filename">Filename</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Order
          </label>
          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Batch Actions */}
      {canPerformBatchUpdate && (
        <div className="flex items-center gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {selectedFiles.size} files selected
          </span>
          <select
            value={batchStatus}
            onChange={(e) => setBatchStatus(e.target.value as CheckStatus)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
            <option value="requires_review">Needs Review</option>
          </select>
          <button
            onClick={handleBatchStatusUpdate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Update Selected
          </button>
          <button
            onClick={() => handleSelectAll(false)}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );

  // File review table
  const tableSection = (
    <div>
      {/* Header with Select All */}
      {sortedFiles.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Files Pending Review
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedFiles.size === sortedFiles.length && sortedFiles.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Select All
            </span>
          </div>
        </div>
      )}

      {/* File List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : sortedFiles.length === 0 ? (
        <div className="text-center py-8">
          <div className="h-12 w-12 text-neutral-400 mx-auto mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 mb-2">
            No files pending review
          </p>
          <p className="text-sm text-neutral-500">
            All uploaded files have been checked or there are no uploads ready for review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedFiles.map((file) => (
            <div
              key={file.id}
              className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={(e) => handleFileSelect(file.id, e.target.checked)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                      {file.books?.name} Chapter {file.chapters?.chapter_number}
                    </h3>
                    <span className="text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded">
                      {file.media_type}
                    </span>
                  </div>
                  
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    {file.remote_path?.split('/').pop() || file.local_path}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>Uploaded: {new Date(file.created_at || '').toLocaleDateString()}</span>
                    {file.duration_seconds && (
                      <span>Duration: {Math.round(file.duration_seconds)}s</span>
                    )}
                    {file.users && (
                      <span>By: {file.users.display_name || file.users.email}</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSingleFileStatus(file.id, 'approved')}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    title="Approve"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleSingleFileStatus(file.id, 'requires_review')}
                    className="p-2 border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    title="Needs Review"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleSingleFileStatus(file.id, 'rejected')}
                    className="p-2 border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Reject"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <DataManagementLayout
      title="Community Check"
      description={`Review and approve uploaded audio files for ${projectName}`}
      filters={filtersSection}
      table={tableSection}
      className="community-check-layout"
    />
  );
}; 