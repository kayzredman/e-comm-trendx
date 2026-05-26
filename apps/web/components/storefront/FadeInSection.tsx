'use client'

import { useRef, ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'

interface Props {
  children: ReactNode
  className?: string
  delay?: number
  /** Direction of the reveal */
  from?: 'bottom' | 'left' | 'right' | 'none'
}

export default function FadeInSection({ children, className, delay = 0, from = 'bottom' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  const initial = {
    opacity: 0,
    y: from === 'bottom' ? 28 : 0,
    x: from === 'left' ? -28 : from === 'right' ? 28 : 0,
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : initial}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94], delay }}
    >
      {children}
    </motion.div>
  )
}
