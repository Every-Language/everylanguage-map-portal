import React from 'react';
import { MetricCard } from '../shared/MetricCard';
import { ProgressRing } from '../shared/ProgressRing';
import { Progress } from '../../../../shared/design-system';

interface ProgressStats {
  audioProgress: {
    versesWithAudio: number;
    totalVerses: number;
    percentage: number;
  };
  textProgress: {
    versesWithText: number;
    totalVerses: number;
    percentage: number;
  };
}

interface ProgressWidgetsProps {
  progressStats?: ProgressStats;
  isLoading: boolean;
}

export const ProgressWidgets: React.FC<ProgressWidgetsProps> = ({
  progressStats,
  isLoading
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Audio Bible Progress */}
      <MetricCard
        title="Audio Bible Progress"
        value={`${Math.round(progressStats?.audioProgress.percentage || 0)}%`}
        subtitle={`${progressStats?.audioProgress.versesWithAudio || 0} of ${progressStats?.audioProgress.totalVerses || 0} chapters`}
        color="secondary"
        isLoading={isLoading}
        icon={
          <ProgressRing
            percentage={progressStats?.audioProgress.percentage || 0}
            color="secondary"
            size="md"
            label="Audio"
          />
        }
      >
        <Progress 
          value={progressStats?.audioProgress.percentage || 0} 
          color="primary"
          className="w-full h-2"
        />
      </MetricCard>

      {/* Written Bible Progress */}
      <MetricCard
        title="Written Bible Progress"
        value={`${Math.round(progressStats?.textProgress.percentage || 0)}%`}
        subtitle={`${progressStats?.textProgress.versesWithText || 0} of ${progressStats?.textProgress.totalVerses || 0} chapters`}
        color="secondary"
        isLoading={isLoading}
        icon={
          <ProgressRing
            percentage={progressStats?.textProgress.percentage || 0}
            color="secondary"
            size="md"
            label="Text"
          />
        }
      >
        <Progress 
          value={progressStats?.textProgress.percentage || 0} 
          color="secondary"
          className="w-full h-2"
        />
      </MetricCard>
    </div>
  );
}; 