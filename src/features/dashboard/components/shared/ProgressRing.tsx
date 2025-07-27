import React from 'react';

interface ProgressRingProps {
  percentage: number;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const colorStyles = {
  blue: {
    background: 'text-blue-200 dark:text-blue-800',
    progress: 'text-blue-600 dark:text-blue-400',
    label: 'text-blue-900 dark:text-blue-100'
  },
  green: {
    background: 'text-green-200 dark:text-green-800',
    progress: 'text-green-600 dark:text-green-400',
    label: 'text-green-900 dark:text-green-100'
  },
  orange: {
    background: 'text-orange-200 dark:text-orange-800',
    progress: 'text-orange-600 dark:text-orange-400',
    label: 'text-orange-900 dark:text-orange-100'
  },
  purple: {
    background: 'text-purple-200 dark:text-purple-800',
    progress: 'text-purple-600 dark:text-purple-400',
    label: 'text-purple-900 dark:text-purple-100'
  },
  red: {
    background: 'text-red-200 dark:text-red-800',
    progress: 'text-red-600 dark:text-red-400',
    label: 'text-red-900 dark:text-red-100'
  },
  primary: {
    background: 'text-primary-200 dark:text-primary-800',
    progress: 'text-primary-600 dark:text-primary-400',
    label: 'text-primary-900 dark:text-primary-100'
  },
  secondary: {
    background: 'text-secondary-200 dark:text-secondary-800',
    progress: 'text-secondary-600 dark:text-secondary-400',
    label: 'text-secondary-900 dark:text-secondary-100'
  }
};

const sizeStyles = {
  sm: {
    ring: 'w-12 h-12',
    text: 'text-xs'
  },
  md: {
    ring: 'w-20 h-20',
    text: 'text-xs'
  },
  lg: {
    ring: 'w-32 h-32',
    text: 'text-sm'
  }
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  color,
  size = 'md',
  label,
  className = ''
}) => {
  const styles = colorStyles[color];
  const sizeStyle = sizeStyles[size];
  
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className={`relative ${sizeStyle.ring} ${className}`}>
      <svg className={`${sizeStyle.ring} transform -rotate-90`} viewBox="0 0 36 36">
        {/* Background circle */}
        <path
          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="100, 100"
          className={styles.background}
        />
        {/* Progress circle */}
        <path
          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${clampedPercentage}, 100`}
          className={styles.progress}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${sizeStyle.text} font-medium ${styles.label}`}>
          {label || `${Math.round(clampedPercentage)}%`}
        </span>
      </div>
    </div>
  );
}; 