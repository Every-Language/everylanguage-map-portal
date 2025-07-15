import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cva } from 'class-variance-authority'
import { cn } from '../utils'

const tooltipContentVariants = cva(
  'z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  {
    variants: {
      variant: {
        default: 'bg-popover text-popover-foreground border-border',
        inverse: 'bg-foreground text-background border-foreground',
        success: 'bg-green-600 text-white border-green-600',
        error: 'bg-red-600 text-white border-red-600',
        warning: 'bg-yellow-600 text-white border-yellow-600',
        info: 'bg-blue-600 text-white border-blue-600',
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const TooltipProvider = TooltipPrimitive.Provider

const TooltipRoot = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: 'default' | 'inverse' | 'success' | 'error' | 'warning' | 'info'
    size?: 'sm' | 'md' | 'lg'
  }
>(({ className, variant, size, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(tooltipContentVariants({ variant, size, className }))}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Compound Tooltip component for easier usage
interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  variant?: 'default' | 'inverse' | 'success' | 'error' | 'warning' | 'info'
  size?: 'sm' | 'md' | 'lg'
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  disableHoverableContent?: boolean
  className?: string
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      children,
      content,
      variant = 'default',
      size = 'md',
      side = 'top',
      align = 'center',
      open,
      defaultOpen,
      onOpenChange,
      delayDuration = 700,
      disableHoverableContent,
      className,
    },
    ref
  ) => (
    <TooltipRoot
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        ref={ref}
        variant={variant}
        size={size}
        side={side}
        align={align}
        className={className}
      >
        {content}
      </TooltipContent>
    </TooltipRoot>
  )
)
Tooltip.displayName = 'Tooltip'

export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
}
export type { TooltipProps } 