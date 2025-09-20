import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg', 
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4'
};

export const BaseModal: React.FC<BaseModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  headerClassName = '',
  contentClassName = ''
}) => {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={closeOnOverlayClick || closeOnEscape ? onOpenChange : undefined}
    >
      <DialogContent 
        className={`${sizeClasses[size]} ${className}`}
        onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
        onPointerDownOutside={closeOnOverlayClick ? undefined : (e) => e.preventDefault()}
      >
        {(title || description || showCloseButton) && (
          <DialogHeader className={headerClassName}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {title && (
                  <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {title}
                  </DialogTitle>
                )}
                {description && (
                  <DialogDescription className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {description}
                  </DialogDescription>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </DialogHeader>
        )}
        
        <div className={`flex-1 ${contentClassName}`}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 