'use client'

import type { CSSProperties } from 'react'

/**
 * trendMarga brand mark.
 *
 *  Wordmark: "trendM" in Cobalt + "arga" in Ash + pulse dot.
 *  Custom flat-bottom `t` glyph (SVG, no font dependency).
 *  Bold M is the pivot. Pulse dot is the only animated brand element.
 *
 *  Variants
 *    - "wordmark"  → full lockup with pulse        (header, splash)
 *    - "mark"      → square tile favicon: tM• ink  (favicon, app icon)
 *    - "letter"    → standalone bold flat-bottom t (loaders, watermarks)
 *
 *  Colors auto-flip on dark backgrounds via `tone`:
 *    - "auto"   → uses currentColor + theme tokens (default)
 *    - "light"  → on dark backgrounds (lighter cobalt tint, ash kept)
 *    - "dark"   → on light backgrounds (cobalt + ash + ink)
 *    - "mono"   → single-color print fallback (ink only)
 */

export const BRAND = {
  cobalt: '#1E40AF',
  cobaltLight: '#60A5FA',
  ash: '#9CA3AF',
  ashDark: '#6B7280',
  ink: '#0A0A0B',
  pulse: '#10B981',
  pulseSoft: 'rgba(16,185,129,0.5)',
} as const

type Tone = 'auto' | 'light' | 'dark' | 'mono'

interface LogoProps {
  variant?: 'wordmark' | 'mark' | 'letter'
  size?: number
  tone?: Tone
  withPulse?: boolean
  className?: string
  style?: CSSProperties
}

// Wordmark t — lighter weight to match Clash Display 600
const T_GLYPH_PATH =
  'M16 0 H30 V20 H42 V32 H30 V72 Q30 80 38 80 H42 V92 H32 Q16 92 16 76 V32 H6 V20 H16 Z'
const T_GLYPH_VIEWBOX = '0 0 42 92'

// Favicon t — heavier weight so it reads cleanly next to bold M at 16-32px
const T_BOLD_PATH =
  'M12 0 H32 V16 H44 V36 H32 V72 Q32 80 40 80 H44 V92 H32 Q12 92 12 74 V36 H0 V16 H12 Z'
const T_BOLD_VIEWBOX = '0 0 44 92'

/* ──────────────────────────────────────────────────────────────
 *  Resolve tone → palette
 * ────────────────────────────────────────────────────────────── */

function resolvePalette(tone: Tone) {
  switch (tone) {
    case 'light':
      // on dark background
      return { blue: BRAND.cobaltLight, ash: BRAND.ash, ink: '#FFFFFF' }
    case 'mono':
      return { blue: BRAND.ink, ash: BRAND.ash, ink: BRAND.ink }
    case 'dark':
    case 'auto':
    default:
      return { blue: BRAND.cobalt, ash: BRAND.ash, ink: BRAND.ink }
  }
}

/* ──────────────────────────────────────────────────────────────
 *  Logo
 * ────────────────────────────────────────────────────────────── */

export function Logo({
  variant = 'wordmark',
  size,
  tone = 'auto',
  withPulse = true,
  className,
  style,
}: LogoProps) {
  const palette = resolvePalette(tone)

  if (variant === 'letter') {
    const px = size ?? 32
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={T_BOLD_VIEWBOX}
        width={px * 0.48}
        height={px}
        className={className}
        style={style}
        aria-label="trendMarga"
        role="img"
      >
        <path d={T_BOLD_PATH} fill="currentColor" />
      </svg>
    )
  }

  if (variant === 'mark') {
    return <LogoMark size={size ?? 32} className={className} style={style} />
  }

  // wordmark
  const fontSize = size ?? 22
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: 0,
        fontFamily: "'Clash Display', 'Inter', system-ui, sans-serif",
        fontWeight: 600,
        letterSpacing: '-0.035em',
        lineHeight: 1,
        fontSize: `${fontSize}px`,
        color: palette.ink,
        whiteSpace: 'nowrap',
        ...style,
      }}
      role="img"
      aria-label="trendMarga"
    >
      {/* custom t */}
      <span
        style={{
          display: 'inline-block',
          height: '0.92em',
          width: '0.42em',
          marginRight: '-0.02em',
          position: 'relative',
          top: '0.04em',
          color: palette.blue,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={T_GLYPH_VIEWBOX}
          preserveAspectRatio="none"
          style={{ display: 'block', height: '100%', width: '100%', overflow: 'visible' }}
          aria-hidden
        >
          <path d={T_GLYPH_PATH} fill="currentColor" />
        </svg>
      </span>
      <span style={{ color: palette.blue }}>rend</span>
      <span style={{ color: palette.blue, fontWeight: 700 }}>M</span>
      <span style={{ color: tone === 'light' ? BRAND.ash : BRAND.ashDark }}>arga</span>
      {withPulse && (
        <span
          style={{
            display: 'inline-block',
            width: '0.18em',
            height: '0.18em',
            borderRadius: '50%',
            marginLeft: '0.14em',
            marginBottom: '0.06em',
            alignSelf: 'flex-end',
            background: BRAND.pulse,
            boxShadow: `0 0 0 0 ${BRAND.pulseSoft}`,
            animation: 'tm-pulse 2.2s ease-in-out infinite',
          }}
        />
      )}
    </span>
  )
}

/* ──────────────────────────────────────────────────────────────
 *  LogoMark — the tM• ink-tile favicon mark
 * ────────────────────────────────────────────────────────────── */

interface LogoMarkProps {
  size?: number
  showPulse?: boolean
  background?: string
  blue?: string
  className?: string
  style?: CSSProperties
}

export function LogoMark({
  size = 32,
  showPulse,
  background = BRAND.ink,
  blue = BRAND.cobalt,
  className,
  style,
}: LogoMarkProps) {
  // Pulse drops out below 24px
  const renderPulse = showPulse ?? size >= 24
  const radius = Math.max(3, Math.round(size * 0.21))
  const fontSize = Math.round(size * 0.6)
  const dotSize = Math.max(3, Math.round(size * 0.115))

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        background,
        color: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.04em',
        fontFamily: "'Clash Display', 'Inter', system-ui, sans-serif",
        fontWeight: 700,
        letterSpacing: '-0.05em',
        lineHeight: 1,
        borderRadius: radius,
        fontSize: `${fontSize}px`,
        flexShrink: 0,
        ...style,
      }}
      role="img"
      aria-label="trendMarga"
    >
      <span
        style={{
          display: 'inline-block',
          height: '0.82em',
          width: '0.46em',
          color: '#FFFFFF',
          position: 'relative',
          top: '0.04em',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={T_BOLD_VIEWBOX}
          preserveAspectRatio="xMidYMax meet"
          style={{ display: 'block', width: '100%', height: '100%' }}
          aria-hidden
        >
          <path d={T_BOLD_PATH} fill="currentColor" />
        </svg>
      </span>
      <span style={{ color: blue }}>M</span>
      {renderPulse && (
        <span
          style={{
            display: 'inline-block',
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: BRAND.pulse,
            alignSelf: 'flex-end',
            marginLeft: '0.08em',
            marginBottom: '0.1em',
          }}
        />
      )}
    </span>
  )
}

export default Logo
