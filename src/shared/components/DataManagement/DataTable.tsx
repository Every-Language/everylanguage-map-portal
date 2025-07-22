import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Checkbox } from '../../design-system';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export interface DataTableColumn<T = Record<string, unknown>> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: unknown, item: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: DataTableColumn<T>[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  
  // Selection
  selectable?: boolean;
  selectedItems?: Set<string> | string[];
  onSelectItem?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  getItemId?: (item: T) => string;
  
  // Sorting
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  
  // Empty state
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  
  // Additional actions
  actions?: React.ReactNode;
  
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  title,
  description,
  isLoading = false,
  searchable = false,
  searchValue = '',
  onSearchChange,
  selectable = false,
  selectedItems = new Set(),
  onSelectItem,
  onSelectAll,
  getItemId = (item) => {
    const record = item as Record<string, unknown>;
    return String(record.id ?? record.key ?? '');
  },
  sortField,
  sortDirection,
  onSort,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no items to display.',
  emptyIcon,
  actions,
  className = ''
}: DataTableProps<T>) {
  
  // Convert selectedItems to Set for consistent handling
  const selectedSet = useMemo(() => {
    if (selectedItems instanceof Set) return selectedItems;
    return new Set(selectedItems);
  }, [selectedItems]);

  // Selection state calculations
  const allCurrentPageSelected = data.length > 0 && data.every(item => selectedSet.has(getItemId(item)));
  const someCurrentPageSelected = data.some(item => selectedSet.has(getItemId(item)));

  // Handle column sorting
  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;
    
    const newDirection = sortField === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectAll) return;
    onSelectAll(checked);
  };

  // Handle individual item selection
  const handleItemSelect = (item: T, checked: boolean) => {
    if (!onSelectItem) return;
    onSelectItem(getItemId(item), checked);
  };

  // Render cell content
  const renderCell = (column: DataTableColumn<T>, item: T, index: number) => {
    const value = item[column.key];
    
    if (column.render) {
      return column.render(value, item, index);
    }
    
    // Default rendering
    if (value === null || value === undefined) {
      return <span className="text-neutral-400">—</span>;
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    return String(value);
  };

  const tableContent = (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            {selectable && (
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox
                  checked={allCurrentPageSelected ? true : someCurrentPageSelected ? 'indeterminate' : false}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all items"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200' : ''
                } ${column.className || ''}`}
                style={{ width: column.width }}
                onClick={() => handleSort(column)}
              >
                <div className={`flex items-center gap-1 ${
                  column.align === 'center' ? 'justify-center' : 
                  column.align === 'right' ? 'justify-end' : 'justify-start'
                }`}>
                  <span>{column.header}</span>
                  {column.sortable && (
                    <div className="flex flex-col">
                      <ChevronUpIcon 
                        className={`h-3 w-3 ${
                          sortField === column.key && sortDirection === 'asc' 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-neutral-300 dark:text-neutral-600'
                        }`} 
                      />
                      <ChevronDownIcon 
                        className={`h-3 w-3 -mt-1 ${
                          sortField === column.key && sortDirection === 'desc' 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-neutral-300 dark:text-neutral-600'
                        }`} 
                      />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {data.map((item, index) => (
            <tr 
              key={getItemId(item)} 
              className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              {selectable && (
                <td className="w-12 px-4 py-4">
                  <Checkbox
                    checked={selectedSet.has(getItemId(item))}
                    onCheckedChange={(checked) => handleItemSelect(item, checked as boolean)}
                    aria-label={`Select item ${getItemId(item)}`}
                  />
                </td>
              )}
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100 ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : 'text-left'
                  } ${column.className || ''}`}
                >
                  {renderCell(column, item, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const emptyState = (
    <div className="text-center py-12">
      {emptyIcon && (
        <div className="flex justify-center mb-4">
          {emptyIcon}
        </div>
      )}
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
        {emptyTitle}
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400">
        {emptyDescription}
      </p>
    </div>
  );

  if (title || description || searchable || actions) {
    return (
      <Card className={className}>
        {(title || description || searchable || actions) && (
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                {title && <CardTitle>{title}</CardTitle>}
                {description && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                {searchable && onSearchChange && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchValue}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-8 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <svg 
                      className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                )}
                {actions}
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : data.length === 0 ? (
            emptyState
          ) : (
            tableContent
          )}
        </CardContent>
      </Card>
    );
  }

  // Simple table without card wrapper
  return (
    <div className={className}>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : data.length === 0 ? (
        emptyState
      ) : (
        tableContent
      )}
    </div>
  );
} 