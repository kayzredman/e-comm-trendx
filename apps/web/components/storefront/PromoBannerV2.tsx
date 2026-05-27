'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function PromoBanner() {
  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl px-8 md:px-12 py-12 grid md:grid-cols-[1fr_auto] items-center gap-8"
          style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            boxShadow: '0 32px 64px rgba(37,99,235,0.35)',
          }}
        >
          {/* decorative orbs */}
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              top: '-30%',
              left: '-5%',
              width: 380,
              height: 380,
              background: 'rgba(255,255,255,0.18)',
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              bottom: '-40%',
              right: '0%',
              width: 480,
              height: 480,
              background: 'rgba(244,63,94,0.32)',
              filter: 'blur(80px)',
            }}
          />

          <div className="relative z-10 text-white">
            <h2 className="font-black text-3xl md:text-4xl mb-2 leading-tight">
              Get 20% off your first order 🎉
            </h2>
            <p className="text-base mb-5 opacity-85">
              Sign up and use your exclusive code at checkout
            </p>
            <div
              className="inline-flex items-center font-mono font-black text-xl tracking-[0.2em] px-5 py-2.5 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '2px dashed rgba(255,255,255,0.55)',
                color: '#fff',
                backdropFilter: 'blur(8px)',
              }}
            >
              TREND20
            </div>
          </div>

          <Link
            href="/sign-in"
            className="relative z-10 inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-extrabold transition-transform hover:scale-105 active:scale-95"
            style={{
              background: '#fff',
              color: '#7C3AED',
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            }}
          >
            Claim Your Discount <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
