import React from 'react';
import { Dialog, Input, Select, SelectItem, Button } from '../../../../shared/design-system';
import type { Role } from '../../../../shared/hooks/query/dashboard';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  roleId: string;
  onEmailChange: (email: string) => void;
  onRoleChange: (roleId: string) => void;
  availableRoles: Role[];
  onSubmit: () => void;
  isValid: boolean;
  isPending: boolean;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  email,
  roleId,
  onEmailChange,
  onRoleChange,
  availableRoles,
  onSubmit,
  isValid,
  isPending
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Role
              </label>
              <Select
                value={roleId}
                onValueChange={onRoleChange}
                placeholder="Select a role"
              >
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button 
              onClick={onSubmit} 
              disabled={!isValid || isPending}
            >
              {isPending ? 'Adding...' : 'Add User'}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}; 