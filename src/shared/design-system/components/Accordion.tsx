import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '../utils'

const accordionVariants = cva(
  'w-full',
  {
    variants: {
      variant: {
        default: 'border border-border rounded-md',
        ghost: 'border-0',
        separated: 'space-y-2',
      },
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const accordionItemVariants = cva(
  'border-b border-border last:border-b-0',
  {
    variants: {
      variant: {
        default: 'border-b border-border last:border-b-0',
        ghost: 'border-0',
        separated: 'border border-border rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const accordionTriggerVariants = cva(
  'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
  {
    variants: {
      variant: {
        default: 'px-4',
        ghost: 'px-0',
        separated: 'px-4',
      },
      size: {
        sm: 'py-2 text-sm',
        md: 'py-4 text-base',
        lg: 'py-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const accordionContentVariants = cva(
  'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordionUp data-[state=open]:animate-accordionDown',
  {
    variants: {
      variant: {
        default: 'px-4 pb-4 pt-0',
        ghost: 'px-0 pb-4 pt-0',
        separated: 'px-4 pb-4 pt-0',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

type AccordionSingleProps = {
  type: 'single'
  collapsible?: boolean
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

type AccordionMultipleProps = {
  type: 'multiple'
  defaultValue?: string[]
  value?: string[]
  onValueChange?: (value: string[]) => void
}

interface AccordionProps {
  className?: string
  variant?: 'default' | 'ghost' | 'separated'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

type AccordionPropsWithType = AccordionProps & (AccordionSingleProps | AccordionMultipleProps)

interface AccordionItemProps extends 
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {
  variant?: 'default' | 'ghost' | 'separated'
}

interface AccordionTriggerProps extends 
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  variant?: 'default' | 'ghost' | 'separated'
  size?: 'sm' | 'md' | 'lg'
  hideIcon?: boolean
}

interface AccordionContentProps extends 
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {
  variant?: 'default' | 'ghost' | 'separated'
  size?: 'sm' | 'md' | 'lg'
}

const Accordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  AccordionPropsWithType
>(({ className, variant, size, type, ...props }, ref) => (
  <AccordionPrimitive.Root
    ref={ref}
    className={cn(accordionVariants({ variant, size, className }))}
    type={type}
    {...props}
  />
))
Accordion.displayName = 'Accordion'

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  AccordionItemProps
>(({ className, variant, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(accordionItemVariants({ variant, className }))}
    {...props}
  />
))
AccordionItem.displayName = 'AccordionItem'

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, variant, size, hideIcon, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(accordionTriggerVariants({ variant, size, className }))}
      {...props}
    >
      {children}
      {!hideIcon && (
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      )}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  AccordionContentProps
>(({ className, variant, size, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(accordionContentVariants({ variant, size, className }))}
    {...props}
  >
    <div className="pb-4 pt-0">{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
export type { AccordionProps, AccordionItemProps, AccordionTriggerProps, AccordionContentProps } 