import React from 'react';
import { BaseModal } from './BaseModal';
import { Button } from '../ui';

export interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void | Promise<void>;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  submitDisabled?: boolean;
  isSubmitting?: boolean;
  showSubmitButton?: boolean;
  showCancelButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  submitVariant?: 'primary' | 'outline' | 'secondary' | 'ghost' | 'link' | 'danger' | 'danger-outline' | 'success' | 'success-outline' | 'warning' | 'warning-outline' | 'info' | 'info-outline';
  footerClassName?: string;
  formClassName?: string;
}

export const FormModal: React.FC<FormModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitText = 'Save',
  cancelText = 'Cancel',
  submitDisabled = false,
  isSubmitting = false,
  showSubmitButton = true,
  showCancelButton = true,
  size = 'md',
  submitVariant = 'primary',
  footerClassName = '',
  formClassName = ''
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit && !isSubmitting && !submitDisabled) {
      try {
        await onSubmit(e);
        // Don't automatically close - let parent component handle success
      } catch (error) {
        // Error should be handled by the calling component
        console.error('Form submission failed:', error);
      }
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
      title={title}
      description={description}
      size={size}
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
      contentClassName="flex flex-col"
    >
      <form 
        onSubmit={handleSubmit}
        className={`flex flex-col flex-1 ${formClassName}`}
      >
        {/* Form Content */}
        <div className="flex-1 space-y-4 mb-6">
          {children}
        </div>

        {/* Footer with Action Buttons */}
        {(showSubmitButton || showCancelButton) && (
          <div className={`flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700 ${footerClassName}`}>
            {showCancelButton && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {cancelText}
              </Button>
            )}
            
            {showSubmitButton && (
              <Button
                type="submit"
                variant={submitVariant}
                disabled={submitDisabled || isSubmitting}
                loading={isSubmitting}
              >
                {submitText}
              </Button>
            )}
          </div>
        )}
      </form>
    </BaseModal>
  );
}; 