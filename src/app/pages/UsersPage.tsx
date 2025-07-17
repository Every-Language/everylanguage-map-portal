import React, { useState, useMemo } from 'react';
import { useSelectedProject } from '../../features/dashboard/hooks/useSelectedProject';
import { useAuth } from '../../features/auth';
import { 
  useProjectUsers, 
  useRoles, 
  useAddUserToProject, 
  useRemoveUserFromProject, 
  useBulkUserOperations 
} from '../../shared/hooks/query/dashboard';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  LoadingSpinner,
  Select,
  SelectItem,
  Input,
  Dialog
} from '../../shared/design-system';
import { 
  UserPlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  ShieldCheckIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

// Types - these would come from your user management hooks
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

interface UserFilters {
  roleId: string;
  status: 'all' | 'active' | 'inactive' | 'pending';
  searchText: string;
}

export const UsersPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  const { user: currentUser } = useAuth();
  
  // State management
  const [filters, setFilters] = useState<UserFilters>({
    roleId: '',
    status: 'all',
    searchText: ''
  });
  
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('');

  // Real data queries
  const { data: projectUsersData, isLoading } = useProjectUsers(selectedProject?.id || null);
  const { data: availableRoles, isLoading: rolesLoading } = useRoles();

  // Transform the data to match our UI expectations
  const projectUsers: ProjectUser[] = useMemo(() => {
    if (!projectUsersData) return [];
    
    return projectUsersData.map(userData => ({
      user: userData.user,
      roles: userData.roles,
      lastActivity: userData.lastActivity,
      status: 'active' as const // Default to active, could be enhanced with real status
    }));
  }, [projectUsersData]);

  // Use real roles from database instead of mock data
  const roles = availableRoles || [];

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    const filtered = projectUsers.filter(user => {
      const matchesRole = !filters.roleId || user.roles.some(role => role === filters.roleId);
      const matchesStatus = filters.status === 'all' || user.status === filters.status;
      const matchesSearch = !filters.searchText || 
        user.user.first_name?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        user.user.last_name?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        user.user.email.toLowerCase().includes(filters.searchText.toLowerCase());
      
      return matchesRole && matchesStatus && matchesSearch;
    });

    return filtered.sort((a, b) => a.user.first_name?.localeCompare(b.user.first_name || '') || a.user.email.localeCompare(b.user.email));
  }, [filters, projectUsers]);

  // Add mutation hooks
  const addUserMutation = useAddUserToProject();
  const removeUserMutation = useRemoveUserFromProject();
  const bulkOperationsMutation = useBulkUserOperations();

  // User management handlers
  const handleUserSelect = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(user => user.user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleAddUser = () => {
    if (!newUserEmail || !newUserRole || !selectedProject) return;
    
    addUserMutation.mutate(
      { 
        projectId: selectedProject.id, 
        userEmail: newUserEmail, 
        roleId: newUserRole 
      },
      {
        onSuccess: () => {
          setNewUserEmail('');
          setNewUserRole('');
          setShowAddUserDialog(false);
          // Show success message
        },
        onError: (error) => {
          console.error('Error adding user:', error);
          // Show error message to user
        }
      }
    );
  };

  const handleEditUser = (user: ProjectUser) => {
    // TODO: Implement edit user modal with role selection
    console.log('Edit user:', user);
  };

  const handleRemoveUser = (userId: string) => {
    if (!selectedProject) return;
    
    if (confirm('Are you sure you want to remove this user from the project?')) {
      removeUserMutation.mutate(
        { projectId: selectedProject.id, userId },
        {
          onSuccess: () => {
            // Show success message
          },
          onError: (error) => {
            console.error('Error removing user:', error);
            // Show error message to user
          }
        }
      );
    }
  };

  const handleBulkAction = (action: 'remove' | 'activate' | 'deactivate') => {
    if (selectedUsers.size === 0 || !selectedProject) return;
    
    const actionText = action === 'remove' ? 'remove' : action;
    if (confirm(`Are you sure you want to ${actionText} ${selectedUsers.size} selected users?`)) {
      if (action === 'remove') {
        bulkOperationsMutation.mutate(
          { 
            projectId: selectedProject.id, 
            userIds: Array.from(selectedUsers), 
            operation: 'remove' 
          },
          {
            onSuccess: () => {
              setSelectedUsers(new Set());
              // Show success message
            },
            onError: (error) => {
              console.error('Error with bulk operation:', error);
              // Show error message to user
            }
          }
        );
      } else {
        // For activate/deactivate, we'd need additional implementation
        console.log(`Bulk ${action} for users:`, Array.from(selectedUsers));
        setSelectedUsers(new Set());
      }
    }
  };

  const getStatusBadge = (status: ProjectUser['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const canManageUsers = currentUser?.email === 'admin@example.com'; // Simplified permission check

  if (!selectedProject) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Users
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage project users and their roles
          </p>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 text-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            Please select a project to manage users
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              Users
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Manage users and their roles for {selectedProject.name}
            </p>
          </div>
          {canManageUsers && (
            <Button onClick={() => setShowAddUserDialog(true)} className="flex items-center gap-2">
              <UserPlusIcon className="h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <UserIcon className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {projectUsers.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Active Users
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {projectUsers.filter(u => u.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Pending Invites
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {projectUsers.filter(u => u.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <UserIcon className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Available Roles
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {roles.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
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
              >
                {roles.map((role) => (
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
          {canManageUsers && selectedUsers.size > 0 && (
            <div className="flex items-center gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {selectedUsers.size} users selected
              </span>
              <Button size="sm" onClick={() => handleBulkAction('activate')} disabled={bulkOperationsMutation.isPending}>
                Activate
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')} disabled={bulkOperationsMutation.isPending}>
                Deactivate
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('remove')} disabled={bulkOperationsMutation.isPending}>
                {bulkOperationsMutation.isPending ? 'Removing...' : 'Remove'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedUsers(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Users</CardTitle>
            {canManageUsers && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
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
          {isLoading || rolesLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400 mb-2">
                No users found
              </p>
              <p className="text-sm text-neutral-500">
                No users match the current filters or no users have been added to this project.
              </p>
            </div>
          ) : (
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
                  {filteredUsers.map((user) => (
                    <tr key={user.user.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      {canManageUsers && (
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.user.id)}
                            onChange={(e) => handleUserSelect(user.user.id, e.target.checked)}
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
                              {roles.find(r => r.id === role)?.name || 'Unknown Role'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(user.status)}
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
                              onClick={() => handleEditUser(user)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveUser(user.user.id)}
                              disabled={removeUserMutation.isPending}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      {showAddUserDialog && (
        <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                Add User to Project
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Role
                  </label>
                  <Select
                    value={newUserRole}
                    onValueChange={setNewUserRole}
                    placeholder="Select a role"
                  >
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button onClick={handleAddUser} disabled={!newUserEmail || !newUserRole || addUserMutation.isPending}>
                  {addUserMutation.isPending ? 'Adding...' : 'Add User'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}; 