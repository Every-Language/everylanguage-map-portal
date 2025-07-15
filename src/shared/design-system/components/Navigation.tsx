import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../utils'

const navigationVariants = cva(
  'flex items-center space-x-1',
  {
    variants: {
      variant: {
        default: 'bg-background border-b border-border',
        ghost: 'bg-transparent',
        pills: 'bg-muted rounded-md p-1',
      },
      size: {
        sm: 'h-8 text-sm',
        md: 'h-10 text-base',
        lg: 'h-12 text-lg',
      },
      orientation: {
        horizontal: 'flex-row',
        vertical: 'flex-col space-x-0 space-y-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      orientation: 'horizontal',
    },
  }
)

const navigationItemVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
        pills: 'hover:bg-background hover:text-foreground data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm',
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

const navigationLinkVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 no-underline',
  {
    variants: {
      variant: {
        default: 'text-foreground hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground',
        pills: 'text-muted-foreground hover:bg-background hover:text-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm',
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

interface NavigationProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'ghost' | 'pills'
  size?: 'sm' | 'md' | 'lg'
  orientation?: 'horizontal' | 'vertical'
  'aria-label'?: string
}

interface NavigationItemProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'ghost' | 'pills'
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

interface NavigationLinkProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'ghost' | 'pills'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  active?: boolean
  disabled?: boolean
  target?: string
  rel?: string
}

const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  ({ children, className, variant, size, orientation, 'aria-label': ariaLabel }, ref) => (
    <nav
      ref={ref}
      className={cn(navigationVariants({ variant, size, orientation, className }))}
      aria-label={ariaLabel}
      role="navigation"
    >
      {children}
    </nav>
  )
)
Navigation.displayName = 'Navigation'

const NavigationItem = React.forwardRef<HTMLButtonElement, NavigationItemProps>(
  ({ children, className, variant, size, active, disabled, onClick }, ref) => (
    <button
      ref={ref}
      className={cn(navigationItemVariants({ variant, size, className }))}
      data-active={active}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
)
NavigationItem.displayName = 'NavigationItem'

const NavigationLink = React.forwardRef<HTMLAnchorElement, NavigationLinkProps>(
  ({ children, className, variant, size, href, active, disabled, target, rel }, ref) => (
    <a
      ref={ref}
      href={href}
      className={cn(navigationLinkVariants({ variant, size, className }))}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled}
      target={target}
      rel={rel}
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </a>
  )
)
NavigationLink.displayName = 'NavigationLink'

export { Navigation, NavigationItem, NavigationLink }
export type { NavigationProps, NavigationItemProps, NavigationLinkProps } 