'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { ElementType } from 'react'

interface Props {
  label: string
  value: string | number
  icon: ElementType
  href: string
  gradient: string
  index?: number
}

export default function AnimatedStatCard({ label, value, icon: Icon, href, gradient, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.10)' }}
    >
      <Link
        href={href}
        className="flex flex-col gap-3 p-4 rounded-2xl border h-full transition-all"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: gradient }}
        >
          <Icon size={18} color="white" />
        </div>
        <div>
          <p className="text-2xl font-extrabold leading-none" style={{ color: 'var(--color-text)' }}>{value}</p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        </div>
      </Link>
    </motion.div>
  )
}
