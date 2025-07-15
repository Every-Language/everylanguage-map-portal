import React from 'react';
import { cn } from '../utils';

export interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700',
          'shadow-sidebar transition-theme',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center h-16 px-6 border-b border-neutral-200 dark:border-neutral-700',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SidebarHeader.displayName = 'SidebarHeader';

export interface SidebarContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1 overflow-y-auto px-3 py-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SidebarContent.displayName = 'SidebarContent';

export interface SidebarNavProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarNav = React.forwardRef<HTMLElement, SidebarNavProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn('space-y-2', className)}
        {...props}
      >
        {children}
      </nav>
    );
  }
);

SidebarNav.displayName = 'SidebarNav';

export interface SidebarNavItemProps {
  href?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ 
  href, 
  icon, 
  children, 
  active, 
  className, 
  onClick,
  ...props 
}) => {
  const baseClassName = cn(
    'flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
    'hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100',
    active 
      ? 'bg-accent-100 dark:bg-accent-800/20 text-accent-900 dark:text-accent-200 shadow-sm' 
      : 'text-neutral-600 dark:text-neutral-400',
    className
  );

  const content = (
    <>
      {icon && (
        <div className="flex-shrink-0 w-5 h-5">
          {icon}
        </div>
      )}
      <span className="flex-1 text-left">{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={baseClassName}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={baseClassName}
      {...props}
    >
      {content}
    </button>
  );
};

SidebarNavItem.displayName = 'SidebarNavItem';

export interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-t border-neutral-200 dark:border-neutral-700 p-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SidebarFooter.displayName = 'SidebarFooter'; 