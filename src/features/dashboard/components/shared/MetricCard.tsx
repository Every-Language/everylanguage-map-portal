import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, LoadingSpinner } from '../../../../shared/design-system';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'primary' | 'secondary';
  isLoading?: boolean;
  children?: React.ReactNode;
}

const colorStyles = {
  blue: {
    card: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800',
    title: 'text-blue-900 dark:text-blue-100',
    value: 'text-blue-900 dark:text-blue-100',
    subtitle: 'text-blue-700 dark:text-blue-300',
    indicator: 'bg-blue-500'
  },
  green: {
    card: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800',
    title: 'text-green-900 dark:text-green-100',
    value: 'text-green-900 dark:text-green-100',
    subtitle: 'text-green-700 dark:text-green-300',
    indicator: 'bg-green-500'
  },
  orange: {
    card: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800',
    title: 'text-orange-900 dark:text-orange-100',
    value: 'text-orange-900 dark:text-orange-100',
    subtitle: 'text-orange-700 dark:text-orange-300',
    indicator: 'bg-orange-500'
  },
  purple: {
    card: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800',
    title: 'text-purple-900 dark:text-purple-100',
    value: 'text-purple-900 dark:text-purple-100',
    subtitle: 'text-purple-700 dark:text-purple-300',
    indicator: 'bg-purple-500'
  },
  red: {
    card: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800',
    title: 'text-red-900 dark:text-red-100',
    value: 'text-red-900 dark:text-red-100',
    subtitle: 'text-red-700 dark:text-red-300',
    indicator: 'bg-red-500'
  },
  primary: {
    card: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800',
    title: 'text-primary-900 dark:text-primary-100',
    value: 'text-primary-900 dark:text-primary-100',
    subtitle: 'text-primary-700 dark:text-primary-300',
    indicator: 'bg-primary-500'
  },
  secondary: {
    card: 'bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/20 dark:to-secondary-800/20 border-secondary-200 dark:border-secondary-800',
    title: 'text-secondary-900 dark:text-secondary-100',
    value: 'text-secondary-900 dark:text-secondary-100',
    subtitle: 'text-secondary-700 dark:text-secondary-300',
    indicator: 'bg-secondary-500'
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  isLoading = false,
  children
}) => {
  const styles = colorStyles[color];

  return (
    <Card className={styles.card}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 ${styles.title}`}>
          {icon && (
            <div className={`w-2 h-2 ${styles.indicator} rounded-full`}></div>
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${styles.value}`}>
                  {value}
                </div>
                {subtitle && (
                  <div className={`text-sm ${styles.subtitle}`}>
                    {subtitle}
                  </div>
                )}
              </div>
              {icon}
            </div>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 