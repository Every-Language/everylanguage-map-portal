import React from 'react';
import { cn } from '../../theme/utils';

// Form Context for validation state management
interface FormContextValue {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  setFieldError: (field: string, error: string | undefined) => void;
  setFieldTouched: (field: string, touched: boolean) => void;
}

const FormContext = React.createContext<FormContextValue | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useFormContext = () => {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return context;
};

// Form Root Component
export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  initialErrors?: Record<string, string>;
  className?: string;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, children, onSubmit, initialErrors = {}, ...props }, ref) => {
    const [errors, setErrors] = React.useState<Record<string, string>>(initialErrors);
    const [touched, setTouched] = React.useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const setFieldError = React.useCallback((field: string, error: string | undefined) => {
      setErrors(prev => ({
        ...prev,
        [field]: error || '',
      }));
    }, []);

    const setFieldTouched = React.useCallback((field: string, touched: boolean) => {
      setTouched(prev => ({
        ...prev,
        [field]: touched,
      }));
    }, []);

    const handleSubmit = React.useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      
      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(e);
        } finally {
          setIsSubmitting(false);
        }
      }
    }, [onSubmit]);

    const contextValue = React.useMemo(() => ({
      errors,
      touched,
      isSubmitting,
      setFieldError,
      setFieldTouched,
    }), [errors, touched, isSubmitting, setFieldError, setFieldTouched]);

    return (
      <FormContext.Provider value={contextValue}>
        <form
          ref={ref}
          className={cn('space-y-6', className)}
          onSubmit={handleSubmit}
          {...props}
        >
          {children}
        </form>
      </FormContext.Provider>
    );
  }
);

Form.displayName = 'Form';

// FormField Compound Component
export interface FormFieldProps {
  name: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ name, children, className }, ref) => {
    const { errors, touched } = useFormContext();
    const hasError = touched[name] && !!errors[name];
    const errorMessage = hasError ? errors[name] : undefined;

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        {children}
        {errorMessage && (
          <FormMessage type="error">{errorMessage}</FormMessage>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// FormLabel Component
export interface FormLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none text-neutral-900',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-error-500 ml-1">*</span>}
    </label>
  )
);

FormLabel.displayName = 'FormLabel';

// FormDescription Component
export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-500', className)}
    {...props}
  />
));

FormDescription.displayName = 'FormDescription';

// FormMessage Component (for errors)
export interface FormMessageProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  type?: 'error' | 'success' | 'warning' | 'info';
}

export const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, type = 'error', ...props }, ref) => {
    const typeStyles = {
      error: 'text-error-600',
      success: 'text-success-600',
      warning: 'text-warning-600',
      info: 'text-info-600',
    };

    return (
      <p
        ref={ref}
        className={cn('text-sm', typeStyles[type], className)}
        role={type === 'error' ? 'alert' : undefined}
        {...props}
      />
    );
  }
);

FormMessage.displayName = 'FormMessage';

// FormGroup Component (for grouping related fields)
export const FormGroup = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => (
  <fieldset
    ref={ref}
    className={cn('space-y-4 border-0 p-0 m-0', className)}
    {...props}
  />
));

FormGroup.displayName = 'FormGroup';

// FormActions Component (for submit buttons)
export const FormActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-end space-x-2 pt-4', className)}
    {...props}
  />
));

FormActions.displayName = 'FormActions'; 