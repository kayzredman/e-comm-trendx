'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { ElementType } from 'react'
import {
  TrendingUp, TrendingDown, Package, ShoppingCart, Users, BarChart2,
  CheckCircle, AlertTriangle, Truck, Tag, Activity,
} from 'lucide-react'

export type StatAccent = 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'cyan'

export type StatIcon =
  | 'revenue' | 'orders' | 'customers' | 'products' | 'analytics'
  | 'success' | 'warning' | 'delivery' | 'tag' | 'activity'

const ICONS: Record<StatIcon, ElementType> = {
  revenue:   TrendingUp,
  orders:    ShoppingCart,
  customers: Users,
  products:  Package,
  analytics: BarChart2,
  success:   CheckCircle,
  warning:   AlertTriangle,
  delivery:  Truck,
  tag:       Tag,
  activity:  Activity,
}

const ACCENT: Record<StatAccent, { orb: string; iconBg: string; iconColor: string }> = {
  blue:   { orb: '#3B82F6', iconBg: '#EFF6FF', iconColor: '#2563EB' },
  green:  { orb: '#10B981', iconBg: '#D1FAE5', iconColor: '#059669' },
  amber:  { orb: '#F59E0B', iconBg: '#FEF3C7', iconColor: '#D97706' },
  purple: { orb: '#7C3AED', iconBg: '#EDE9FE', iconColor: '#7C3AED' },
  rose:   { orb: '#EF4444', iconBg: '#FEE2E2', iconColor: '#DC2626' },
  cyan:   { orb: '#0891B2', iconBg: '#CFFAFE', iconColor: '#0891B2' },
}

interface Props {
  label: string
  value: string | number
  icon: StatIcon
  href: string
  accent?: StatAccent
  /** e.g. "+12.5%" or "-3.2%" */
  change?: string
  index?: number
}

export default function AnimatedStatCard({
  label, value, icon, href, accent = 'blue', change, index = 0,
}: Props) {
  const a = ACCENT[accent]
  const Icon = ICONS[icon]
  const up = change ? !change.trim().startsWith('-') : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.34, 1.1, 0.64, 1] as const }}
      whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.10)' }}
      className="group h-full"
    >
      <Link
        href={href}
        className="relative block h-full p-5 rounded-2xl overflow-hidden transition-colors"
        style={{
          background: '#FFFFFF',
          border: '1.5px solid rgba(226,232,240,0.8)',
        }}
      >
        {/* hover orb */}
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full transition-all duration-300 group-hover:opacity-[0.14] group-hover:scale-125"
          style={{
            top: -30, right: -30, width: 100, height: 100, opacity: 0.08, background: a.orb,
          }}
        />
        <div
          className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-3.5"
          style={{ background: a.iconBg }}
        >
          <Icon size={20} color={a.iconColor} />
        </div>
        <div className="relative">
          <p
            className="font-black leading-none font-mono tabular-nums"
            style={{ color: '#0F172A', fontSize: '28px', letterSpacing: '-1px' }}
          >
            {value}
          </p>
          <p className="mt-1.5 font-medium" style={{ color: '#64748B', fontSize: '12.5px' }}>
            {label}
          </p>
          {change && (
            <span
              className="inline-flex items-center gap-1 mt-2 font-bold"
              style={{
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '5px',
                background: up ? '#D1FAE5' : '#FEE2E2',
                color: up ? '#065F46' : '#991B1B',
              }}
            >
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {change}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
