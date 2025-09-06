import * as React from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '../../theme/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border border-border p-4',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50',
        error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-50',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-50',
        info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-50',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive',
      },
      size: {
        sm: 'p-3 text-sm',
        md: 'p-4 text-base',
        lg: 'p-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  dismissible?: boolean
  onDismiss?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, size, showIcon = true, dismissible, onDismiss, children, ...props }, ref) => {
    const getIcon = () => {
      if (!showIcon) return null
      
      switch (variant) {
        case 'success':
          return <CheckCircle className="h-4 w-4 text-green-600" />
        case 'error':
        case 'destructive':
          return <AlertCircle className="h-4 w-4 text-red-600" />
        case 'warning':
          return <AlertTriangle className="h-4 w-4 text-yellow-600" />
        case 'info':
          return <Info className="h-4 w-4 text-blue-600" />
        default:
          return <Info className="h-4 w-4" />
      }
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant, size }), className)}
        {...props}
      >
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1">
            {children}
          </div>
          {dismissible && (
            <button
              type="button"
              className="ml-auto rounded-md p-1 text-foreground/50 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={onDismiss}
              aria-label="Close alert"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
export type { AlertProps }