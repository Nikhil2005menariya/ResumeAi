import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function SpotlightButton({
  children,
  className,
  onClick,
  type = 'button',
}: SpotlightButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const button = btnRef.current
    const spotlight = spanRef.current
    if (!button || !spotlight) return

    const handleMouseMove = (e: MouseEvent) => {
      const bounds = button.getBoundingClientRect()
      const offset = e.clientX - bounds.left
      const left = `${(offset / bounds.width) * 100}%`
      spotlight.animate([{ left }], { duration: 250, fill: 'forwards' })
    }

    const handleMouseLeave = () => {
      spotlight.animate([{ left: '50%' }], { duration: 100, fill: 'forwards' })
    }

    button.addEventListener('mousemove', handleMouseMove)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mousemove', handleMouseMove)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      ref={btnRef}
      onClick={onClick}
      type={type}
      className={cn(
        'relative w-full overflow-hidden rounded-lg bg-slate-950 px-6 py-3 text-base font-semibold text-white',
        className
      )}
    >
      <span className="pointer-events-none relative z-10 mix-blend-difference">
        {children}
      </span>
      <span
        ref={spanRef}
        className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-100"
      />
    </motion.button>
  )
}
