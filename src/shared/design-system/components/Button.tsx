import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-lg font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-600 text-white shadow-sm',
          'hover:bg-primary-700 hover:shadow-md',
          'dark:bg-primary-600 dark:text-white',
          'dark:hover:bg-primary-700',
          'focus-visible:ring-primary-500',
        ],
        secondary: [
          'bg-neutral-100 text-neutral-900 border border-neutral-200',
          'hover:bg-neutral-50 hover:border-neutral-300',
          'dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700',
          'dark:hover:bg-neutral-700 dark:hover:border-neutral-600',
          'focus-visible:ring-neutral-500',
        ],
        outline: [
          'border border-primary-300 text-primary-700 bg-transparent',
          'hover:bg-primary-50 hover:border-primary-400',
          'dark:border-primary-600 dark:text-primary-400',
          'dark:hover:bg-primary-900/20 dark:hover:border-primary-500',
          'focus-visible:ring-primary-500',
        ],
        ghost: [
          'text-neutral-600 bg-transparent',
          'hover:bg-neutral-100 hover:text-neutral-700',
          'dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
          'focus-visible:ring-neutral-500',
        ],
        danger: [
          'bg-error-600 text-white shadow-sm',
          'hover:bg-error-700 hover:shadow-md',
          'dark:bg-error-600 dark:text-white',
          'dark:hover:bg-error-700',
          'focus-visible:ring-error-500',
        ],
        'danger-outline': [
          'border border-error-300 text-error-700 bg-transparent',
          'hover:bg-error-50 hover:border-error-400',
          'dark:border-error-600 dark:text-error-400',
          'dark:hover:bg-error-900/20 dark:hover:border-error-500',
          'focus-visible:ring-error-500',
        ],
        success: [
          'bg-green-600 text-white shadow-sm',
          'hover:bg-green-700 hover:shadow-md',
          'dark:bg-green-600 dark:text-white',
          'dark:hover:bg-green-700',
          'focus-visible:ring-green-500',
        ],
        'success-outline': [
          'border border-green-300 text-green-700 bg-transparent',
          'hover:bg-green-50 hover:border-green-400',
          'dark:border-green-600 dark:text-green-400',
          'dark:hover:bg-green-900/20 dark:hover:border-green-500',
          'focus-visible:ring-green-500',
        ],
        warning: [
          'bg-yellow-600 text-white shadow-sm',
          'hover:bg-yellow-700 hover:shadow-md',
          'dark:bg-yellow-600 dark:text-white',
          'dark:hover:bg-yellow-700',
          'focus-visible:ring-yellow-500',
        ],
        'warning-outline': [
          'border border-yellow-300 text-yellow-700 bg-transparent',
          'hover:bg-yellow-50 hover:border-yellow-400',
          'dark:border-yellow-600 dark:text-yellow-400',
          'dark:hover:bg-yellow-900/20 dark:hover:border-yellow-500',
          'focus-visible:ring-yellow-500',
        ],
        info: [
          'bg-blue-600 text-white shadow-sm',
          'hover:bg-blue-700 hover:shadow-md',
          'dark:bg-blue-600 dark:text-white',
          'dark:hover:bg-blue-700',
          'focus-visible:ring-blue-500',
        ],
        'info-outline': [
          'border border-blue-300 text-blue-700 bg-transparent',
          'hover:bg-blue-50 hover:border-blue-400',
          'dark:border-blue-600 dark:text-blue-400',
          'dark:hover:bg-blue-900/20 dark:hover:border-blue-500',
          'focus-visible:ring-blue-500',
        ],
        link: [
          'text-primary-600 bg-transparent p-0 h-auto',
          'hover:text-primary-700 hover:underline',
          'dark:text-primary-400 dark:hover:text-primary-300',
          'focus-visible:ring-primary-500',
        ],
      },
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
  fullWidth?: boolean;
  as?: 'button' | 'a';
  href?: string;
  target?: string;
  rel?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false,
    icon,
    iconPosition = 'left',
    leftIcon,
    rightIcon,
    loadingText,
    fullWidth = false,
    disabled,
    children, 
    as = 'button',
    href,
    target,
    rel,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;
    const isIconOnly = !children && (icon || leftIcon || rightIcon);
    
    // Determine which icon to show on the left
    const leftIconToShow = loading ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      leftIcon || (icon && iconPosition === 'left' && icon)
    );
    
    // Determine which icon to show on the right
    const rightIconToShow = !loading && (
      rightIcon || (icon && iconPosition === 'right' && icon)
    );

    const content = (
      <>
        {leftIconToShow && (
          <span className={cn('flex-shrink-0', isIconOnly && 'mr-0')}>
            {leftIconToShow}
          </span>
        )}
        
        {loading && loadingText ? loadingText : children}
        
        {rightIconToShow && (
          <span className={cn('flex-shrink-0', isIconOnly && 'ml-0')}>
            {rightIconToShow}
          </span>
        )}
      </>
    );

    const baseClassName = cn(
      buttonVariants({ variant, size }),
      fullWidth && 'w-full',
      className
    );

    if (as === 'a') {
      return (
        <a
          ref={ref as React.ForwardedRef<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={rel}
          className={baseClassName}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        className={baseClassName}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Icon Button variant
export const IconButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'children'> & { 
  icon: React.ReactNode;
  'aria-label': string;
}>(
  ({ icon, size = 'icon', ...props }, ref) => (
    <Button
      ref={ref}
      size={size}
      icon={icon}
      {...props}
    />
  )
);

IconButton.displayName = 'IconButton';

// Button Group for grouping related buttons
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ children, className, orientation = 'horizontal', spacing = 'sm', ...props }, ref) => {
    const spacingClasses = {
      none: '',
      sm: orientation === 'horizontal' ? 'space-x-2' : 'space-y-2',
      md: orientation === 'horizontal' ? 'space-x-4' : 'space-y-4',
      lg: orientation === 'horizontal' ? 'space-x-6' : 'space-y-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col',
          spacingClasses[spacing],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ButtonGroup.displayName = 'ButtonGroup';

export default Button; 