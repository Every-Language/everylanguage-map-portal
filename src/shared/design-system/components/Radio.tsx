import React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const radioVariants = cva(
  [
    'aspect-square h-4 w-4 rounded-full border border-neutral-300 text-primary-600',
    'shadow-sm transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600',
  ],
  {
    variants: {
      size: {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const radioGroupVariants = cva([
  'grid gap-2',
], {
  variants: {
    layout: {
      horizontal: 'grid-flow-col auto-cols-max',
      vertical: 'grid-flow-row',
    },
  },
  defaultVariants: {
    layout: 'vertical',
  },
});

// RadioGroup Root Component
export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>,
    VariantProps<typeof radioGroupVariants> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ 
  className, 
  layout,
  label, 
  description, 
  error, 
  required,
  children,
  ...props 
}, ref) => {
  const groupId = React.useId();
  const hasError = !!error;

  return (
    <div className="space-y-2">
      {label && (
        <div className="space-y-1">
          <label
            className="text-sm font-medium leading-none text-neutral-900"
            id={`${groupId}-label`}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
          
          {description && (
            <p 
              id={`${groupId}-description`}
              className="text-xs text-neutral-500"
            >
              {description}
            </p>
          )}
        </div>
      )}
      
      <RadioGroupPrimitive.Root
        ref={ref}
        className={cn(radioGroupVariants({ layout }), className)}
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-describedby={
          error ? `${groupId}-error` : description ? `${groupId}-description` : undefined
        }
        aria-invalid={hasError}
        {...props}
      >
        {children}
      </RadioGroupPrimitive.Root>
      
      {error && (
        <p id={`${groupId}-error`} className="text-sm text-error-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

// RadioGroup Item Component
export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
    VariantProps<typeof radioVariants> {
  label?: string;
  description?: string;
  id?: string;
}

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ 
  className, 
  size,
  label, 
  description, 
  id,
  children,
  ...props 
}, ref) => {
  const generatedId = React.useId();
  const itemId = id || generatedId;

  return (
    <div className="flex items-start space-x-2">
      <RadioGroupPrimitive.Item
        ref={ref}
        id={itemId}
        className={cn(radioVariants({ size }), className)}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-current" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      
      {(label || children) && (
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor={itemId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {label || children}
          </label>
          
          {description && (
            <p className="text-xs text-neutral-500">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName; 