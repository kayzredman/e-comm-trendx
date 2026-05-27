/**
 * Feature flags — central kill-switch registry.
 *
 * All new features default to OFF. Toggle via env vars or admin UI.
 * Server-side flags are read from process.env at boot.
 * Client-side flags are exposed via NEXT_PUBLIC_FEATURE_* vars.
 *
 * USAGE
 *   import { features } from '@trendx/config'
 *   if (features.cmsContent) { ... }
 */

function readFlag(envValue: string | undefined, defaultValue = false): boolean {
  if (envValue === undefined || envValue === '') return defaultValue
  return envValue === 'true' || envValue === '1' || envValue === 'on'
}

type FeatureFlags = {
  /** CMS Content module powers the storefront homepage hero/sections */
  cmsContent: boolean
  /** Global product search on storefront */
  search: boolean
  /** Inventory / stock tracking, low-stock badges, out-of-stock UI */
  inventory: boolean
  /** SMS + email notifications on order events */
  notifications: boolean
  /** Product reviews & star ratings */
  reviews: boolean
  /** Discount / promo codes at checkout */
  discounts: boolean
  /** PWA installability + push notifications */
  pwa: boolean
}

/**
 * Server-side feature flags. Read once at module load.
 * In edge/serverless contexts this is re-evaluated per cold start.
 */
export const features: FeatureFlags = {
  cmsContent:    readFlag(process.env.FEATURE_CMS_CONTENT),
  search:        readFlag(process.env.FEATURE_SEARCH),
  inventory:     readFlag(process.env.FEATURE_INVENTORY),
  notifications: readFlag(process.env.FEATURE_NOTIFICATIONS),
  reviews:       readFlag(process.env.FEATURE_REVIEWS),
  discounts:     readFlag(process.env.FEATURE_DISCOUNTS),
  pwa:           readFlag(process.env.FEATURE_PWA),
}

/**
 * Client-safe feature flags — must use NEXT_PUBLIC_* env vars so they
 * are inlined at build time and available in the browser bundle.
 */
export const publicFeatures: FeatureFlags = {
  cmsContent:    readFlag(process.env.NEXT_PUBLIC_FEATURE_CMS_CONTENT),
  search:        readFlag(process.env.NEXT_PUBLIC_FEATURE_SEARCH),
  inventory:     readFlag(process.env.NEXT_PUBLIC_FEATURE_INVENTORY),
  notifications: readFlag(process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS),
  reviews:       readFlag(process.env.NEXT_PUBLIC_FEATURE_REVIEWS),
  discounts:     readFlag(process.env.NEXT_PUBLIC_FEATURE_DISCOUNTS),
  pwa:           readFlag(process.env.NEXT_PUBLIC_FEATURE_PWA),
}

export type { FeatureFlags }
