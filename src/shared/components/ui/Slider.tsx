import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cva } from 'class-variance-authority'
import { cn } from '../../theme/utils'

const sliderVariants = cva(
  'relative flex w-full touch-none select-none items-center',
  {
    variants: {
      size: {
        sm: 'h-4',
        md: 'h-5',
        lg: 'h-6',
      },
      variant: {
        default: '',
        volume: 'h-2',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
)

const sliderTrackVariants = cva(
  'relative h-2 w-full grow overflow-hidden rounded-full bg-secondary',
  {
    variants: {
      variant: {
        default: 'bg-gray-200 dark:bg-gray-700',
        volume: 'bg-gray-200 dark:bg-gray-700 h-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const sliderRangeVariants = cva(
  'absolute h-full bg-primary',
  {
    variants: {
      variant: {
        default: 'bg-blue-500 dark:bg-blue-400',
        volume: 'bg-blue-500 dark:bg-blue-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const sliderThumbVariants = cva(
  'block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-blue-500 bg-white dark:bg-gray-800 shadow-md',
        volume: 'h-4 w-4 border-blue-500 bg-white dark:bg-gray-800 shadow-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  variant?: 'default' | 'volume'
  size?: 'sm' | 'md' | 'lg'
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant = 'default', size = 'md', ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(sliderVariants({ size, variant }), className)}
    {...props}
  >
    <SliderPrimitive.Track className={cn(sliderTrackVariants({ variant }))}>
      <SliderPrimitive.Range className={cn(sliderRangeVariants({ variant }))} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={cn(sliderThumbVariants({ variant }))} />
  </SliderPrimitive.Root>
))

Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
export type { SliderProps } 