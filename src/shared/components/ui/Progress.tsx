import React from 'react';
import { cn } from '../../theme/utils';

export interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
  className?: string;
  showValue?: boolean;
  label?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'linear',
  size = 'md',
  color = 'primary',
  className,
  showValue = false,
  label,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses = {
    primary: 'text-primary-600 bg-primary-600',
    accent: 'text-accent-600 bg-accent-600',
    success: 'text-success-600 bg-success-600',
    warning: 'text-warning-600 bg-warning-600',
    error: 'text-error-600 bg-error-600',
  } as const;

  if (variant === 'circular') {
    const sizeClasses = {
      sm: 'w-12 h-12',
      md: 'w-16 h-16',
      lg: 'w-20 h-20',
    };

    const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
    const radius = size === 'sm' ? 18 : size === 'md' ? 24 : 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className={cn('relative inline-flex items-center justify-center', sizeClasses[size], className)}>
        <svg
          className="transform -rotate-90"
          width="100%"
          height="100%"
          viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`}
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            className="text-neutral-200"
          />
          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn('transition-all duration-500 ease-out', colorClasses[color])}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-sm font-semibold text-neutral-900 dark:text-neutral-100')}>
              {Math.round(percentage)}%
            </span>
          </div>
        )}
        {label && (
          <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-neutral-500">
            {label}
          </span>
        )}
      </div>
    );
  }

  // Linear progress
  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
          {showValue && <span className="text-sm text-neutral-500">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={cn('bg-neutral-200 rounded-full overflow-hidden', heightClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

Progress.displayName = 'Progress'; 