import React from 'react'
import { Progress } from '@/shared/components/ui/Progress'

export const AnimatedProgress: React.FC<{ value: number; max?: number; color?: 'primary' | 'accent' | 'success' | 'warning' | 'error'; variant?: 'linear' | 'circular'; size?: 'sm' | 'md' | 'lg'; className?: string }>
  = ({ value, max = 100, color = 'accent', variant = 'linear', size = 'md', className }) => {
    const [display, setDisplay] = React.useState(0)
    React.useEffect(() => {
      const start = performance.now()
      const durationMs = 600
      let raf = 0
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay((value) * eased)
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
      return () => cancelAnimationFrame(raf)
    }, [value])
    return <Progress value={display} max={max} color={color} variant={variant} size={size} className={className} />
  }

export default AnimatedProgress


