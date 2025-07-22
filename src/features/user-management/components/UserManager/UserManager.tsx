import React from 'react';
import { useUserManagement } from '../../hooks/useUserManagement';
import { DataManagementLayout } from '../../../../shared/components/DataManagementLayout';
import { UserStatsCards } from './UserStatsCards';
import { UserFilters } from './UserFilters';
import { UserTable } from './UserTable';
import { AddUserModal } from './AddUserModal';

interface UserManagerProps {
  projectId: string;
  projectName: string;
}

export const UserManager: React.FC<UserManagerProps> = ({ projectId, projectName }) => {
  const userManagement = useUserManagement(projectId);

  const statsSection = (
    <UserStatsCards 
      statistics={userManagement.statistics}
      isLoading={userManagement.isLoading}
    />
  );

  const filtersSection = (
    <UserFilters
      filters={userManagement.filters}
      setFilters={userManagement.setFilters}
      availableRoles={userManagement.availableRoles}
      rolesLoading={userManagement.rolesLoading}
      selectedCount={userManagement.selection.selectedCount}
      onBulkAction={userManagement.operations.handleBulkAction}
      onClearSelection={userManagement.selection.clearSelection}
      canManageUsers={userManagement.permissions.canManageUsers}
      bulkOperationsPending={userManagement.mutations.bulkOperations.isPending}
    />
  );

  const tableSection = (
    <UserTable
      users={userManagement.filteredUsers}
      availableRoles={userManagement.availableRoles}
      isLoading={userManagement.isLoading}
      selectedUsers={userManagement.selectedUsers}
      onUserSelect={userManagement.selection.handleUserSelect}
      onSelectAll={userManagement.selection.handleSelectAll}
      isAllSelected={userManagement.selection.isAllSelected}
      onEditUser={userManagement.operations.handleEditUser}
      onRemoveUser={userManagement.operations.handleRemoveUser}
      canManageUsers={userManagement.permissions.canManageUsers}
      removeUserPending={userManagement.mutations.removeUser.isPending}
      getStatusBadge={userManagement.utils.getStatusBadge}
    />
  );

  const modalsSection = userManagement.modals.showAddUser ? (
    <AddUserModal
      isOpen={userManagement.modals.showAddUser}
      onClose={userManagement.modals.closeAddUser}
      email={userManagement.addUserForm.email}
      roleId={userManagement.addUserForm.roleId}
      onEmailChange={userManagement.addUserForm.setEmail}
      onRoleChange={userManagement.addUserForm.setRoleId}
      availableRoles={userManagement.availableRoles}
      onSubmit={userManagement.operations.handleAddUser}
      isValid={userManagement.addUserForm.isValid}
      isPending={userManagement.mutations.addUser.isPending}
    />
  ) : null;

  return (
    <DataManagementLayout
      title="Users"
      description={`Manage users and their roles for ${projectName}`}
      actions={
        userManagement.permissions.canManageUsers ? (
          <button
            onClick={userManagement.modals.openAddUser}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add User
          </button>
        ) : undefined
      }
      filters={filtersSection}
      table={tableSection}
      modals={modalsSection}
    >
      {statsSection}
    </DataManagementLayout>
  );
}; 