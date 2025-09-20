import React from 'react';
import { BaseModal } from './BaseModal';
import { Button } from '../ui';
import { ExclamationTriangleIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';

export interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
  disabled?: boolean;
}

const variantConfig = {
  danger: {
    icon: TrashIcon,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100 dark:bg-red-900/20',
    confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
    confirmText: 'Delete'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
    confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    confirmText: 'Continue'
  },
  info: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
    confirmText: 'Confirm'
  },
  success: {
    icon: CheckIcon,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100 dark:bg-green-900/20',
    confirmButton: 'bg-green-600 hover:bg-green-700 text-white',
    confirmText: 'Confirm'
  }
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onOpenChange,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
  isLoading = false,
  disabled = false
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;
  const finalConfirmText = confirmText || config.confirmText;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error should be handled by the calling component
      console.error('Confirmation action failed:', error);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      showCloseButton={false}
    >
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.iconBg}`}>
          <Icon className={`h-6 w-6 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            {title}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            {description}
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={disabled || isLoading}
              loading={isLoading}
              className={config.confirmButton}
            >
              {finalConfirmText}
            </Button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}; 