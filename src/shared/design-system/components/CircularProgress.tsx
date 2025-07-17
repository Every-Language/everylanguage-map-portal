import React from 'react';
import { cn } from '../utils';

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  children,
  showPercentage = true,
  color = 'blue'
}) => {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  const colorClasses = {
    blue: 'stroke-blue-600 dark:stroke-blue-400',
    green: 'stroke-green-600 dark:stroke-green-400',
    yellow: 'stroke-yellow-600 dark:stroke-yellow-400',
    red: 'stroke-red-600 dark:stroke-red-400',
    purple: 'stroke-purple-600 dark:stroke-purple-400'
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-200 dark:text-neutral-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(colorClasses[color], 'transition-all duration-300 ease-in-out')}
        />
      </svg>
      
      {/* Content overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children ? (
          children
        ) : showPercentage ? (
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {Math.round(normalizedValue)}%
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}; 