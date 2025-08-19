import { useState, useMemo } from 'react';
import { useAuth } from '../../auth';
import { 
  useProjectUsers, 
  useRoles, 
  useAddUserToProject, 
  useRemoveUserFromProject, 
  useBulkUserOperations 
} from '../../../shared/hooks/query/dashboard';

// Types - these would eventually move to the types directory
interface User {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
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

export function useUserManagement(projectId: string) {
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
  
  // Data fetching
  const { data: projectUsersData, isLoading } = useProjectUsers(projectId);
  const { data: availableRoles, isLoading: rolesLoading } = useRoles();
  
  // Mutations
  const addUserMutation = useAddUserToProject();
  const removeUserMutation = useRemoveUserFromProject();
  const bulkOperationsMutation = useBulkUserOperations();
  
  // Transform the data to match UI expectations
  const projectUsers: ProjectUser[] = useMemo(() => {
    if (!projectUsersData) return [];
    
    return projectUsersData.map(userData => ({
      user: userData.user,
      roles: userData.roles,
      lastActivity: userData.lastActivity,
      status: 'active' as const // Default to active, could be enhanced with real status
    }));
  }, [projectUsersData]);
  
  // Use real roles from database
  const roles = useMemo(() => availableRoles || [], [availableRoles]);
  
  // Filter and sort users
  const filteredUsers = useMemo(() => {
    const filtered = projectUsers.filter(user => {
      const matchesRole = !filters.roleId || user.roles.some(role => role === filters.roleId);
      const matchesStatus = filters.status === 'all' || user.status === filters.status;
      const matchesSearch = !filters.searchText || 
        (user.user.first_name && user.user.first_name.toLowerCase().includes(filters.searchText.toLowerCase())) ||
        (user.user.last_name && user.user.last_name.toLowerCase().includes(filters.searchText.toLowerCase())) ||
        (user.user.email && user.user.email.toLowerCase().includes(filters.searchText.toLowerCase()));
      
      return matchesRole && matchesStatus && matchesSearch;
    });

    return filtered.sort((a, b) => {
      const aName = a.user.first_name || a.user.email || 'Unknown';
      const bName = b.user.first_name || b.user.email || 'Unknown';
      return aName.localeCompare(bName);
    });
  }, [filters, projectUsers]);
  
  // Statistics computation
  const statistics = useMemo(() => ({
    totalUsers: projectUsers.length,
    activeUsers: projectUsers.filter(u => u.status === 'active').length,
    pendingInvites: projectUsers.filter(u => u.status === 'pending').length,
    availableRoles: roles.length
  }), [projectUsers, roles]);
  
  // Permission checking
  const canManageUsers = currentUser?.email === 'admin@example.com'; // Simplified permission check
  
  // Selection management
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
  
  // User operations
  const handleAddUser = () => {
    if (!newUserEmail || !newUserRole || !projectId) return;
    
    addUserMutation.mutate(
      { 
        projectId, 
        userEmail: newUserEmail, 
        roleId: newUserRole 
      },
      {
        onSuccess: () => {
          setNewUserEmail('');
          setNewUserRole('');
          setShowAddUserDialog(false);
          // Success handled by React Query cache invalidation
        },
        onError: (error) => {
          console.error('Error adding user:', error);
          // Error handling would be enhanced with toast notifications
        }
      }
    );
  };

  const handleEditUser = (user: ProjectUser) => {
    // TODO: Implement edit user modal with role selection
    console.log('Edit user:', user);
  };

  const handleRemoveUser = (userId: string) => {
    if (!projectId) return;
    
    if (confirm('Are you sure you want to remove this user from the project?')) {
      removeUserMutation.mutate(
        { projectId, userId },
        {
          onSuccess: () => {
            // Success handled by React Query cache invalidation
          },
          onError: (error) => {
            console.error('Error removing user:', error);
            // Error handling would be enhanced with toast notifications
          }
        }
      );
    }
  };

  const handleBulkAction = (action: 'remove' | 'activate' | 'deactivate') => {
    if (selectedUsers.size === 0 || !projectId) return;
    
    const actionText = action === 'remove' ? 'remove' : action;
    if (confirm(`Are you sure you want to ${actionText} ${selectedUsers.size} selected users?`)) {
      if (action === 'remove') {
        bulkOperationsMutation.mutate(
          { 
            projectId, 
            userIds: Array.from(selectedUsers), 
            operation: 'remove' 
          },
          {
            onSuccess: () => {
              setSelectedUsers(new Set());
              // Success handled by React Query cache invalidation
            },
            onError: (error) => {
              console.error('Error with bulk operation:', error);
              // Error handling would be enhanced with toast notifications
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
  
  // Status badge utility - returns className and text
  const getStatusBadge = (status: ProjectUser['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };
    
    return {
      className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`,
      text: status.charAt(0).toUpperCase() + status.slice(1)
    };
  };
  
  return {
    // State
    filters,
    setFilters,
    selectedUsers,
    
    // Data
    projectUsers,
    filteredUsers,
    availableRoles: roles,
    isLoading,
    rolesLoading,
    
    // Statistics
    statistics,
    
    // Modal management
    modals: {
      showAddUser: showAddUserDialog,
      openAddUser: () => setShowAddUserDialog(true),
      closeAddUser: () => setShowAddUserDialog(false)
    },
    
    // Form management
    addUserForm: {
      email: newUserEmail,
      roleId: newUserRole,
      setEmail: setNewUserEmail,
      setRoleId: setNewUserRole,
      isValid: Boolean(newUserEmail && newUserRole)
    },
    
    // Selection management
    selection: {
      handleUserSelect,
      handleSelectAll,
      clearSelection: () => setSelectedUsers(new Set()),
      selectedCount: selectedUsers.size,
      isAllSelected: selectedUsers.size === filteredUsers.length && filteredUsers.length > 0
    },
    
    // User operations
    operations: {
      handleAddUser,
      handleEditUser,
      handleRemoveUser,
      handleBulkAction
    },
    
    // Mutations status
    mutations: {
      addUser: {
        isPending: addUserMutation.isPending
      },
      removeUser: {
        isPending: removeUserMutation.isPending
      },
      bulkOperations: {
        isPending: bulkOperationsMutation.isPending
      }
    },
    
    // Permissions
    permissions: {
      canManageUsers
    },
    
    // Utilities
    utils: {
      getStatusBadge
    }
  };
} 