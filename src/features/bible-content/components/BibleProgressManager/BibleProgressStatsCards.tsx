import React from 'react';
import { MetricCard } from '../../../dashboard/components/shared/MetricCard';
import { Progress } from '../../../../shared/design-system';
import type { ProgressStats } from '../../hooks/useBibleProgress';

interface BibleProgressStatsCardsProps {
  progressStats?: ProgressStats;
  isLoading: boolean;
}

export const BibleProgressStatsCards: React.FC<BibleProgressStatsCardsProps> = ({
  progressStats,
  isLoading
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Books Progress Card */}
      <MetricCard
        title="Books Progress"
        value={`${Math.round(progressStats?.booksProgress.percentage || 0)}%`}
        subtitle={`${progressStats?.booksProgress.completed || 0} of ${progressStats?.booksProgress.total || 0} books`}
        color="secondary"
        isLoading={isLoading}
        icon={
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {progressStats?.booksProgress.completed || 0}
            </div>
            <div className="text-xs text-primary-500 dark:text-primary-300">
              Complete
            </div>
          </div>
        }
      >
        <Progress 
          value={progressStats?.booksProgress.percentage || 0} 
          color="primary"
          className="w-full h-2"
        />
      </MetricCard>

      {/* Chapters Progress Card */}
      <MetricCard
        title="Chapters Progress"
        value={`${Math.round(progressStats?.chaptersProgress.percentage || 0)}%`}
        subtitle={`${progressStats?.chaptersProgress.completed || 0} of ${progressStats?.chaptersProgress.total || 0} chapters`}
        color="secondary"
        isLoading={isLoading}
        icon={
          <div className="text-right">
            <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
              {progressStats?.chaptersProgress.completed || 0}
            </div>
            <div className="text-xs text-secondary-500 dark:text-secondary-300">
              Complete
            </div>
          </div>
        }
      >
        <Progress 
          value={progressStats?.chaptersProgress.percentage || 0} 
          color="secondary"
          className="w-full h-2"
        />
      </MetricCard>
    </div>
  );
}; 