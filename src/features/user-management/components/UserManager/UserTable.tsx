import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Button } from '../../../../shared/design-system';
import { UserIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Role } from '../../../../shared/hooks/query/dashboard';

interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  auth_uid: string;
  phone_number?: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

interface ProjectUser {
  user: User;
  roles: string[];
  lastActivity?: string | null;
  status: 'active' | 'inactive' | 'pending';
}

interface UserTableProps {
  users: ProjectUser[];
  availableRoles: Role[];
  isLoading: boolean;
  selectedUsers: Set<string>;
  onUserSelect: (userId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  isAllSelected: boolean;
  onEditUser: (user: ProjectUser) => void;
  onRemoveUser: (userId: string) => void;
  canManageUsers: boolean;
  removeUserPending: boolean;
  getStatusBadge: (status: ProjectUser['status']) => { className: string; text: string };
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  availableRoles,
  isLoading,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  isAllSelected,
  onEditUser,
  onRemoveUser,
  canManageUsers,
  removeUserPending,
  getStatusBadge
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <UserIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400 mb-2">
              No users found
            </p>
            <p className="text-sm text-neutral-500">
              No users match the current filters or no users have been added to this project.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Users</CardTitle>
          {canManageUsers && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Select All
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                {canManageUsers && (
                  <th className="text-left py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                    Select
                  </th>
                )}
                <th className="text-left py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                  User
                </th>
                <th className="text-left py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                  Role
                </th>
                <th className="text-left py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                  Last Activity
                </th>
                <th className="text-left py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                  Added
                </th>
                {canManageUsers && (
                  <th className="text-left py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const statusBadge = getStatusBadge(user.status);
                
                return (
                  <tr key={user.user.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    {canManageUsers && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.user.id)}
                          onChange={(e) => onUserSelect(user.user.id, e.target.checked)}
                          className="rounded border-neutral-300"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {user.user.first_name || 'Unknown User'} {user.user.last_name || ''}
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {user.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded"
                          >
                            {availableRoles.find(r => r.id === role)?.name || 'Unknown Role'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={statusBadge.className}>
                        {statusBadge.text}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                      {user.lastActivity 
                        ? new Date(user.lastActivity).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                      {user.user.created_at ? new Date(user.user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    {canManageUsers && (
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditUser(user)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRemoveUser(user.user.id)}
                            disabled={removeUserPending}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}; 