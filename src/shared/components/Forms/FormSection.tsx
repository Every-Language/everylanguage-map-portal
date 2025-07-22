import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  collapsible = false,
  defaultExpanded = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`border border-neutral-200 dark:border-neutral-700 rounded-lg ${className}`}>
      {/* Section Header */}
      <div 
        className={`px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 ${
          collapsible ? 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800' : ''
        }`}
        onClick={toggleExpanded}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={collapsible ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        } : undefined}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {description}
              </p>
            )}
          </div>
          
          {collapsible && (
            <div className="ml-4">
              {isExpanded ? (
                <ChevronDownIcon className="h-5 w-5 text-neutral-500" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-neutral-500" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}; 