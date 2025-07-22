import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Select, SelectItem, Input, Button } from '../../../../shared/design-system';
import type { Role } from '../../../../shared/hooks/query/dashboard';

interface UserFilters {
  roleId: string;
  status: 'all' | 'active' | 'inactive' | 'pending';
  searchText: string;
}

interface UserFiltersProps {
  filters: UserFilters;
  setFilters: (filters: UserFilters | ((prev: UserFilters) => UserFilters)) => void;
  availableRoles: Role[];
  rolesLoading: boolean;
  selectedCount: number;
  onBulkAction: (action: 'remove' | 'activate' | 'deactivate') => void;
  onClearSelection: () => void;
  canManageUsers: boolean;
  bulkOperationsPending: boolean;
}

export const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  setFilters,
  availableRoles,
  rolesLoading,
  selectedCount,
  onBulkAction,
  onClearSelection,
  canManageUsers,
  bulkOperationsPending
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filters & Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Role
            </label>
            <Select
              value={filters.roleId}
              onValueChange={(value) => setFilters(prev => ({ ...prev, roleId: value }))}
              placeholder="All roles"
              disabled={rolesLoading}
            >
              {availableRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Status
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as UserFilters['status'] }))}
            >
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Search Users
            </label>
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={filters.searchText}
              onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {canManageUsers && selectedCount > 0 && (
          <div className="flex items-center gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {selectedCount} users selected
            </span>
            <Button 
              size="sm" 
              onClick={() => onBulkAction('activate')} 
              disabled={bulkOperationsPending}
            >
              Activate
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onBulkAction('deactivate')} 
              disabled={bulkOperationsPending}
            >
              Deactivate
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onBulkAction('remove')} 
              disabled={bulkOperationsPending}
            >
              {bulkOperationsPending ? 'Removing...' : 'Remove'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onClearSelection}
            >
              Clear Selection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 