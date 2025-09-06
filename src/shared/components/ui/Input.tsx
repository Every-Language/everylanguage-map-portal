import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../theme/utils';

const inputVariants = cva(
  [
    'flex w-full rounded-lg border transition-colors duration-200',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'placeholder:text-neutral-500 dark:placeholder:text-neutral-400',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'aria-[invalid=true]:border-error-500 aria-[invalid=true]:focus-visible:ring-error-500',
    'text-neutral-900 dark:text-neutral-100',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800',
          'hover:border-neutral-300 dark:hover:border-neutral-600',
          'focus-visible:border-primary-500 dark:focus-visible:border-primary-400 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
          'focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
        ],
        filled: [
          'border-transparent bg-neutral-100 dark:bg-neutral-700',
          'hover:bg-neutral-50 dark:hover:bg-neutral-600',
          'focus-visible:bg-white dark:focus-visible:bg-neutral-800 focus-visible:border-primary-500 dark:focus-visible:border-primary-400 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
          'focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-3 text-sm',
        lg: 'h-11 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    type = 'text',
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    containerClassName,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              {leftIcon}
            </div>
          )}
          
          <input
            type={type}
            id={inputId}
            className={cn(
              inputVariants({ variant, size }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-error-600 dark:text-error-400"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="text-sm text-neutral-500 dark:text-neutral-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input'; 