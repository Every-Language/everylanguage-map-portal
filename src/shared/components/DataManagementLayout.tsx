import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../design-system';
import { cn } from '../design-system/utils';

export interface DataManagementLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  table: React.ReactNode;
  modals?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  filtersClassName?: string;
  tableClassName?: string;
  children?: React.ReactNode;
}

export const DataManagementLayout: React.FC<DataManagementLayoutProps> = ({
  title,
  description,
  actions,
  filters,
  table,
  modals,
  className,
  headerClassName,
  filtersClassName,
  tableClassName,
  children,
}) => {
  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Header */}
      <div className={cn('flex items-center justify-between', headerClassName)}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          {description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>

      {/* Custom content area */}
      {children}

      {/* Filters */}
      {filters && (
        <Card className={filtersClassName}>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            {filters}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className={tableClassName}>
        {table}
      </Card>

      {/* Modals */}
      {modals}
    </div>
  );
};

export default DataManagementLayout; 