import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner, DataTable } from '../../../../shared/design-system';

interface ActivityItem extends Record<string, unknown> {
  id: string;
  type: 'audio' | 'text';
  reference: string;
  filename: string;
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
          {item.type === 'audio' ? 'Audio' : 'Text'}
        </span>
      )
    },
    {
      key: 'reference',
      header: 'Verse Reference',
      render: (_value: unknown, item: ActivityItem) => (
        <div className="font-medium text-neutral-900 dark:text-neutral-100">
          {item.reference}
        </div>
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
    },
    {
      key: 'filename',
      header: 'File Name',
      render: (_value: unknown, item: ActivityItem) => (
        <div className="text-sm text-neutral-900 dark:text-neutral-100 max-w-[200px] truncate" title={item.filename}>
          {item.filename}
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
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : activityData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-600 dark:text-neutral-400">
              No recent activity to display
            </p>
          </div>
        ) : (
          <DataTable
            columns={recentActivityColumns}
            data={activityData}
            emptyMessage="No recent activity"
            className="text-sm"
          />
        )}
      </CardContent>
    </Card>
  );
}; 