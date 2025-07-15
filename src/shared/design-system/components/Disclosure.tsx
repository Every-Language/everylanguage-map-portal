import * as React from 'react'
import { Disclosure as HeadlessDisclosure, Transition } from '@headlessui/react'
import { ChevronDown } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '../utils'

const disclosureVariants = cva(
  'w-full',
  {
    variants: {
      variant: {
        default: 'border border-border rounded-md',
        ghost: 'border-0',
        outlined: 'border border-border',
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

const disclosureButtonVariants = cva(
  'flex w-full items-center justify-between rounded-md px-4 py-2 text-left font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        ghost: 'bg-transparent text-foreground hover:bg-accent',
        outlined: 'bg-transparent text-foreground border border-border hover:bg-accent',
      },
      size: {
        sm: 'px-2 py-1 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const disclosurePanelVariants = cva(
  'overflow-hidden text-sm text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'px-4 pb-4 pt-0',
        ghost: 'px-0 pb-4 pt-0',
        outlined: 'px-4 pb-4 pt-0',
      },
      size: {
        sm: 'px-2 pb-2 pt-0 text-xs',
        md: 'px-4 pb-4 pt-0 text-sm',
        lg: 'px-6 pb-6 pt-0 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

interface DisclosureProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'ghost' | 'outlined'
  size?: 'sm' | 'md' | 'lg'
  defaultOpen?: boolean
}

interface DisclosureButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'ghost' | 'outlined'
  size?: 'sm' | 'md' | 'lg'
  hideIcon?: boolean
  icon?: React.ReactNode
}

interface DisclosurePanelProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'ghost' | 'outlined'
  size?: 'sm' | 'md' | 'lg'
  unmount?: boolean
}

const Disclosure = React.forwardRef<HTMLDivElement, DisclosureProps>(
  ({ children, className, variant, size, defaultOpen }, ref) => (
    <HeadlessDisclosure
      as="div"
      ref={ref}
      className={cn(disclosureVariants({ variant, size, className }))}
      defaultOpen={defaultOpen}
    >
      {children}
    </HeadlessDisclosure>
  )
)
Disclosure.displayName = 'Disclosure'

const DisclosureButton = React.forwardRef<HTMLButtonElement, DisclosureButtonProps>(
  ({ children, className, variant, size, hideIcon, icon }, ref) => (
    <HeadlessDisclosure.Button
      ref={ref}
      className={cn(disclosureButtonVariants({ variant, size, className }))}
    >
      {({ open }) => (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          <span className="flex-1">{children}</span>
          {!hideIcon && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          )}
        </>
      )}
    </HeadlessDisclosure.Button>
  )
)
DisclosureButton.displayName = 'DisclosureButton'

const DisclosurePanel = React.forwardRef<HTMLDivElement, DisclosurePanelProps>(
  ({ children, className, variant, size, unmount = false }, ref) => (
    <Transition
      enter="transition duration-100 ease-out"
      enterFrom="transform scale-95 opacity-0"
      enterTo="transform scale-100 opacity-100"
      leave="transition duration-75 ease-out"
      leaveFrom="transform scale-100 opacity-100"
      leaveTo="transform scale-95 opacity-0"
    >
      <HeadlessDisclosure.Panel
        ref={ref}
        className={cn(disclosurePanelVariants({ variant, size, className }))}
        unmount={unmount}
      >
        {children}
      </HeadlessDisclosure.Panel>
    </Transition>
  )
)
DisclosurePanel.displayName = 'DisclosurePanel'

export { Disclosure, DisclosureButton, DisclosurePanel }
export type { DisclosureProps, DisclosureButtonProps, DisclosurePanelProps } 