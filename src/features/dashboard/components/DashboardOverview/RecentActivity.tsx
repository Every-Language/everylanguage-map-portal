import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner, DataTable } from '../../../../shared/design-system';

interface ActivityItem extends Record<string, unknown> {
  id: string;
  type: 'audio' | 'text';
  reference: string;
  status: string;
  date: string;
}

interface RecentActivityProps {
  activityData: ActivityItem[];
  isLoading: boolean;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activityData,
  isLoading
}) => {
  // Prepare recent activity data for table
  const recentActivityColumns = [
    {
      key: 'type',
      header: 'Type',
      render: (_value: unknown, item: ActivityItem) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          item.type === 'audio' 
            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300'
            : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-300'
        }`}>
          {item.type === 'audio' ? 'Audio File' : 'Bible Text'}
        </span>
      )
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (_value: unknown, item: ActivityItem) => (
        <div className="font-medium text-neutral-900 dark:text-neutral-100">
          {item.reference}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (_value: unknown, item: ActivityItem) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          item.status === 'completed' || item.status === 'approved'
            ? 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-300'
            : item.status === 'pending'
            ? 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-300'
            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
        }`}>
          {item.status}
        </span>
      )
    },
    {
      key: 'date',
      header: 'Date',
      render: (_value: unknown, item: ActivityItem) => (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {new Date(item.date).toLocaleDateString()}
        </div>
      )
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : activityData.length > 0 ? (
          <DataTable
            data={activityData}
            columns={recentActivityColumns}
            searchable={false}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-neutral-600 dark:text-neutral-400">No recent activity found</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
              Recent uploads and updates will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 