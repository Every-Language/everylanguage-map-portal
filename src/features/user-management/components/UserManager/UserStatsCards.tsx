import React from 'react';
import { Card, CardContent, LoadingSpinner } from '../../../../shared/design-system';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  EnvelopeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface UserStatsCardsProps {
  statistics: {
    totalUsers: number;
    activeUsers: number;
    pendingInvites: number;
    availableRoles: number;
  };
  isLoading: boolean;
}

export const UserStatsCards: React.FC<UserStatsCardsProps> = ({ statistics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Users',
      value: statistics.totalUsers,
      icon: UserIcon,
      color: 'text-blue-500'
    },
    {
      label: 'Active Users',
      value: statistics.activeUsers,
      icon: ShieldCheckIcon,
      color: 'text-green-500'
    },
    {
      label: 'Pending Invites',
      value: statistics.pendingInvites,
      icon: EnvelopeIcon,
      color: 'text-orange-500'
    },
    {
      label: 'Available Roles',
      value: statistics.availableRoles,
      icon: UserGroupIcon,
      color: 'text-purple-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}; 