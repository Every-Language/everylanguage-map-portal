import React from 'react'

export interface CountUpProps {
  value: number
  durationMs?: number
  prefix?: string
  suffix?: string
  formatter?: (n: number) => string
  className?: string
}

export const CountUp: React.FC<CountUpProps> = ({
  value,
  durationMs = 600,
  prefix = '',
  suffix = '',
  formatter,
  className,
}) => {
  const [display, setDisplay] = React.useState(0)
  const fromRef = React.useRef(0)
  const toRef = React.useRef(value)

  React.useEffect(() => {
    fromRef.current = 0
    toRef.current = value
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = Math.round(fromRef.current + (toRef.current - fromRef.current) * eased)
      setDisplay(next)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  const text = formatter ? formatter(display) : display.toLocaleString()

  return <span className={className}>{prefix}{text}{suffix}</span>
}

export default CountUp


