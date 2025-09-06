import * as React from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDown, Check } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '../../theme/utils'

const dropdownVariants = cva(
  'relative inline-block text-left',
  {
    variants: {
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

const dropdownTriggerVariants = cva(
  'inline-flex w-full justify-center items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input bg-background text-foreground',
        ghost: 'border-transparent bg-transparent shadow-none hover:bg-accent',
        outline: 'border-input bg-transparent text-foreground hover:bg-accent',
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const dropdownContentVariants = cva(
  'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg',
  {
    variants: {
      align: {
        start: 'left-0',
        center: 'left-1/2 -translate-x-1/2',
        end: 'right-0',
      },
      side: {
        top: 'bottom-full mb-1',
        bottom: 'top-full mt-1',
      },
      size: {
        sm: 'min-w-[6rem]',
        md: 'min-w-[8rem]',
        lg: 'min-w-[12rem]',
      },
    },
    defaultVariants: {
      align: 'start',
      side: 'bottom',
      size: 'md',
    },
  }
)

const dropdownItemVariants = cva(
  'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      variant: {
        default: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'text-destructive hover:bg-destructive hover:text-destructive-foreground',
      },
      size: {
        sm: 'px-1.5 py-1 text-xs',
        md: 'px-2 py-1.5 text-sm',
        lg: 'px-3 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const dropdownSeparatorVariants = cva(
  'my-1 h-px bg-border',
  {
    variants: {
      size: {
        sm: 'my-0.5',
        md: 'my-1',
        lg: 'my-2',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

interface DropdownProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

interface DropdownTriggerProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  showChevron?: boolean
  disabled?: boolean
}

interface DropdownContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom'
  size?: 'sm' | 'md' | 'lg'
}

interface DropdownItemProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  icon?: React.ReactNode
  selected?: boolean
}

interface DropdownSeparatorProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

interface DropdownLabelProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  ({ children, className, size }, ref) => (
    <Menu as="div" ref={ref} className={cn(dropdownVariants({ size, className }))}>
      {children}
    </Menu>
  )
)
Dropdown.displayName = 'Dropdown'

const DropdownTrigger = React.forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ children, className, variant, size, showChevron = true, disabled }, ref) => (
    <Menu.Button
      ref={ref}
      className={cn(dropdownTriggerVariants({ variant, size, className }))}
      disabled={disabled}
    >
      {children}
      {showChevron && (
        <ChevronDown className="ml-1 h-4 w-4" />
      )}
    </Menu.Button>
  )
)
DropdownTrigger.displayName = 'DropdownTrigger'

const DropdownContent = React.forwardRef<HTMLDivElement, DropdownContentProps>(
  ({ children, className, align, side, size }, ref) => (
    <Transition
      as={React.Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <Menu.Items
        ref={ref}
        className={cn(dropdownContentVariants({ align, side, size, className }))}
      >
        {children}
      </Menu.Items>
    </Transition>
  )
)
DropdownContent.displayName = 'DropdownContent'

const DropdownItem = React.forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ children, className, variant, size, disabled, onClick, icon, selected }, ref) => (
    <Menu.Item disabled={disabled}>
      {({ active, disabled: itemDisabled }) => (
        <div
          ref={ref}
          className={cn(
            dropdownItemVariants({ variant, size }),
            active && 'bg-accent text-accent-foreground',
            itemDisabled && 'pointer-events-none opacity-50',
            className
          )}
          onClick={onClick}
        >
          {icon && <span className="mr-2">{icon}</span>}
          <span className="flex-1">{children}</span>
          {selected && (
            <Check className="ml-auto h-4 w-4" />
          )}
        </div>
      )}
    </Menu.Item>
  )
)
DropdownItem.displayName = 'DropdownItem'

const DropdownSeparator = React.forwardRef<HTMLDivElement, DropdownSeparatorProps>(
  ({ className, size }, ref) => (
    <div
      ref={ref}
      className={cn(dropdownSeparatorVariants({ size, className }))}
    />
  )
)
DropdownSeparator.displayName = 'DropdownSeparator'

const DropdownLabel = React.forwardRef<HTMLDivElement, DropdownLabelProps>(
  ({ children, className, size }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-2 py-1.5 text-sm font-semibold text-muted-foreground',
        size === 'sm' && 'px-1.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-2 text-base',
        className
      )}
    >
      {children}
    </div>
  )
)
DropdownLabel.displayName = 'DropdownLabel'

export {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
}
export type {
  DropdownProps,
  DropdownTriggerProps,
  DropdownContentProps,
  DropdownItemProps,
  DropdownSeparatorProps,
  DropdownLabelProps,
} 