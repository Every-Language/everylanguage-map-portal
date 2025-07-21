import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const selectTriggerVariants = cva(
  [
    'flex h-10 w-full items-center justify-between',
    'rounded-lg border bg-white px-3 py-2',
    'text-sm placeholder:text-neutral-500',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[state=open]:border-primary-500',
    'data-[placeholder]:text-neutral-500',
    'transition-colors duration-200',
    // Dark mode support
    'dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100',
    'dark:placeholder:text-neutral-400 dark:data-[placeholder]:text-neutral-400',
    'dark:focus:ring-offset-neutral-800',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-neutral-200 bg-white',
          'hover:border-neutral-300',
          'focus:border-primary-500',
          // Dark mode
          'dark:border-neutral-700 dark:bg-neutral-800',
          'dark:hover:border-neutral-600',
          'dark:focus:border-primary-400',
        ],
        filled: [
          'border-transparent bg-neutral-100',
          'hover:bg-neutral-50',
          'focus:bg-white focus:border-primary-500',
          // Dark mode
          'dark:bg-neutral-700 dark:hover:bg-neutral-600',
          'dark:focus:bg-neutral-800 dark:focus:border-primary-400',
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
  'relative z-50 min-w-[8rem] max-h-[300px] overflow-hidden rounded-lg border',
  'bg-white text-neutral-900 shadow-lg',
  'animate-in fade-in-0 zoom-in-95 duration-200',
  // Dark mode support
  'dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100',
]);

const selectItemVariants = cva([
  'relative flex w-full cursor-default select-none items-center',
  'rounded-sm py-2 pl-8 pr-2 text-sm outline-none',
  'focus:bg-primary-50 focus:text-primary-900',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  'data-[state=checked]:bg-primary-100 data-[state=checked]:text-primary-900',
  // Dark mode support
  'dark:focus:bg-primary-900/20 dark:focus:text-primary-100',
  'dark:data-[state=checked]:bg-primary-900/30 dark:data-[state=checked]:text-primary-100',
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
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
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
            <SelectPrimitive.Viewport className="p-1 max-h-[280px] overflow-y-auto">
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      
      {error && (
        <p id={`${selectId}-error`} className="text-sm text-error-600 dark:text-error-400" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="text-sm text-neutral-500 dark:text-neutral-400">
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
    className={cn('px-2 py-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100', className)}
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

// Searchable Select component for long lists
export interface SearchableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  options: Array<{ value: string; label: string; }>;
}

export const SearchableSelect = React.forwardRef<
  HTMLButtonElement,
  SearchableSelectProps
>(({ 
  value, 
  onValueChange, 
  placeholder = "Select option...",
  searchPlaceholder = "Search...", 
  disabled, 
  label, 
  error, 
  helperText, 
  required, 
  className,
  options = []
}, ref) => {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const selectId = React.useId();
  const hasError = !!error;

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    
    const searchLower = searchTerm.toLowerCase();
    const filtered = options.filter(option => 
      option.label.toLowerCase().includes(searchLower)
    );
    
    // Always include the currently selected option to prevent SelectPrimitive from losing track
    // but only if it's not already in the filtered results
    const selectedOption = value ? options.find(option => option.value === value) : null;
    const hasSelectedInFiltered = selectedOption && filtered.find(option => option.value === value);
    
    if (selectedOption && !hasSelectedInFiltered) {
      // Add the selected option to the end so search results come first
      filtered.push(selectedOption);
    }
    
    // Sort filtered results to prioritize better matches
    return filtered.sort((a, b) => {
      const aLabel = a.label.toLowerCase();
      const bLabel = b.label.toLowerCase();
      
      // If one starts with the search term, prioritize it
      const aStartsWith = aLabel.startsWith(searchLower);
      const bStartsWith = bLabel.startsWith(searchLower);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // If both or neither start with search term, sort alphabetically
      return aLabel.localeCompare(bLabel);
    });
  }, [options, searchTerm, value]);

  const selectedOption = options.find(option => option.value === value);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (searchInputRef.current && open) {
          searchInputRef.current.focus();
        }
      });
    }
  }, [open]);

  const handleSelect = React.useCallback((selectedValue: string) => {
    onValueChange?.(selectedValue);
    setOpen(false);
    setSearchTerm('');
  }, [onValueChange]);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchTerm('');
    }
  }, []);

  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent event from bubbling up to SelectPrimitive
    e.stopPropagation();
    
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelect(filteredOptions[0].value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown' && filteredOptions.length > 0) {
      e.preventDefault();
      // Focus first option in the list
      const firstOption = document.querySelector('[data-radix-collection-item]') as HTMLElement;
      if (firstOption) {
        firstOption.focus();
      }
    }
  }, [filteredOptions, handleSelect]);

  // Prevent clicks on search input from closing the dropdown
  const handleInputClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Prevent mousedown on search input from closing dropdown
  const handleInputMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <SelectPrimitive.Root
        value={value}
        onValueChange={handleSelect}
        disabled={disabled}
        open={open}
        onOpenChange={handleOpenChange}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={selectId}
          className={cn(
            selectTriggerVariants({ variant: 'default', size: 'md' }),
            hasError && 'border-error-500 focus:ring-error-500',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
        >
          <SelectPrimitive.Value>
            {selectedOption?.label || placeholder}
          </SelectPrimitive.Value>
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
            className={cn(selectContentVariants())}
            position="popper"
            sideOffset={5}
            onCloseAutoFocus={(e) => {
              // Prevent auto-focus behavior that might interfere
              e.preventDefault();
            }}
          >
            <div className="p-2 border-b border-neutral-200 dark:border-neutral-700">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleInputKeyDown}
                onClick={handleInputClick}
                onMouseDown={handleInputMouseDown}
                className="w-full px-3 py-2 text-sm border rounded-md border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoComplete="off"
              />
            </div>
            <SelectPrimitive.Viewport className="p-1 max-h-[240px] overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-2 py-3 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                  No results found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    className={cn(selectItemVariants())}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' && e.currentTarget === e.currentTarget.parentElement?.firstElementChild) {
                        e.preventDefault();
                        searchInputRef.current?.focus();
                      }
                    }}
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
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      
      {error && (
        <p id={`${selectId}-error`} className="text-sm text-error-600 dark:text-error-400" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="text-sm text-neutral-500 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

SearchableSelect.displayName = 'SearchableSelect'; 