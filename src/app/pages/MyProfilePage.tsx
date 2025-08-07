import React from 'react';
import { ProfileManager } from '../../features/user-management/components';

export const MyProfilePage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          My Profile
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Manage your account settings and personal information
        </p>
      </div>

      <ProfileManager />
    </div>
  );
}; 