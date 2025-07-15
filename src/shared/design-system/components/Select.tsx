import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const selectTriggerVariants = cva(
  [
    'flex h-10 w-full items-center justify-between',
    'rounded-lg border border-neutral-200 bg-white px-3 py-2',
    'text-sm placeholder:text-neutral-500',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=open]:border-primary-500',
    'data-[placeholder]:text-neutral-500',
    'transition-colors duration-200',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-neutral-200 bg-white',
          'hover:border-neutral-300',
          'focus:border-primary-500',
        ],
        filled: [
          'border-transparent bg-neutral-100',
          'hover:bg-neutral-50',
          'focus:bg-white focus:border-primary-500',
        ],
      },
      size: {
        sm: 'h-8 px-2 text-sm',
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

const selectContentVariants = cva([
  'relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-neutral-200',
  'bg-white text-neutral-900 shadow-lg',
  'animate-in fade-in-0 zoom-in-95 duration-200',
]);

const selectItemVariants = cva([
  'relative flex w-full cursor-default select-none items-center',
  'rounded-sm py-2 pl-8 pr-2 text-sm outline-none',
  'focus:bg-primary-50 focus:text-primary-900',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  'data-[state=checked]:bg-primary-100 data-[state=checked]:text-primary-900',
]);

// Main Select component
export interface SelectProps extends VariantProps<typeof selectTriggerVariants> {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  children: React.ReactNode;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  contentClassName?: string;
}

// Select Root component
export const Select = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectProps
>(({ 
  value, 
  onValueChange, 
  placeholder, 
  disabled, 
  children, 
  label, 
  error, 
  helperText, 
  required, 
  variant,
  size,
  className,
  contentClassName,
  ...props 
}, ref) => {
  const selectId = React.useId();
  const hasError = !!error;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-neutral-700"
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        {...props}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={selectId}
          className={cn(
            selectTriggerVariants({ variant, size }),
            hasError && 'border-error-500 focus:ring-error-500',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 opacity-50"
            >
              <path
                d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(selectContentVariants(), contentClassName)}
            position="popper"
            sideOffset={5}
          >
            <SelectPrimitive.Viewport className="p-1">
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      
      {error && (
        <p id={`${selectId}-error`} className="text-sm text-error-600" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="text-sm text-neutral-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Select Item component
export interface SelectItemProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  children: React.ReactNode;
}

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(selectItemVariants(), className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
        >
          <path
            d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      </SelectPrimitive.ItemIndicator>
    </span>
    
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));

SelectItem.displayName = 'SelectItem';

// Select Group component
export const SelectGroup = SelectPrimitive.Group;

// Select Label component
export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold text-neutral-900', className)}
    {...props}
  />
));

SelectLabel.displayName = 'SelectLabel';

// Select Separator component
export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-neutral-200', className)}
    {...props}
  />
));

SelectSeparator.displayName = 'SelectSeparator'; 