import React from 'react';
import { useAuth } from '../../../auth';
import { useSelectedProject } from '../../hooks/useSelectedProject';
import { useDashboardData } from '../../hooks/useDashboardData';
import { ProgressWidgets } from './ProgressWidgets';
import { RecentActivity } from './RecentActivity';
import { ProjectInfo } from './ProjectInfo';
import { BibleVersionSelector } from './BibleVersionSelector';

export const DashboardOverview: React.FC = () => {
  const { user, dbUser } = useAuth();
  const { selectedProject } = useSelectedProject();
  
  const dashboardData = useDashboardData({ 
    projectId: selectedProject?.id || null 
  });

  if (!selectedProject) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto mt-16 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            No Project Selected
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Please select a project from the sidebar to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Dashboard
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Welcome back, {dbUser?.first_name || user?.email?.split('@')[0]}!
        </p>
        <p className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mt-2">
          {selectedProject.name}
        </p>
      </div>

      {/* Bible Version Selector */}
      <BibleVersionSelector
        selectedVersion={dashboardData.selectedBibleVersion}
        onVersionChange={dashboardData.setSelectedBibleVersion}
        versions={dashboardData.bibleVersions}
      />

      {/* Progress Widgets */}
      <ProgressWidgets
        progressStats={dashboardData.progressStats}
        isLoading={dashboardData.progressLoading}
      />

      {/* Recent Activity */}
      <RecentActivity
        activityData={dashboardData.recentActivityData}
        isLoading={dashboardData.activityLoading}
      />

      {/* Project Information */}
      <ProjectInfo
        projectMetadata={dashboardData.projectMetadata}
        isLoading={dashboardData.metadataLoading}
      />
    </div>
  );
}; 