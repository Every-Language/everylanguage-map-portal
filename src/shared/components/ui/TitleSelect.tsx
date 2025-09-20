import React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '../../theme/utils'

export interface TitleSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export const TitleSelect = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  TitleSelectProps
>(({ value, onValueChange, placeholder, disabled, children, className, contentClassName }, ref) => {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
          // Make trigger look like a plain title
          'inline-flex items-center gap-2 text-lg font-semibold',
          'bg-transparent border-0 px-0 py-0 h-auto',
          'focus:outline-none focus:ring-0 focus:ring-offset-0',
          'text-neutral-900 dark:text-neutral-100',
          'hover:opacity-80 transition-opacity',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <svg
            width="16"
            height="16"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 opacity-60"
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
          className={cn(
            'relative z-50 min-w-[8rem] max-h-[300px] overflow-hidden rounded-lg border',
            'bg-white text-neutral-900 shadow-lg',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            'dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100',
            contentClassName
          )}
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport className="p-1 max-h-[280px] overflow-y-auto">
            {children}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
})

TitleSelect.displayName = 'TitleSelect'


