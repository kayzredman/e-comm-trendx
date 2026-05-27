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
type FeatureFlags = {
    /** CMS Content module powers the storefront homepage hero/sections */
    cmsContent: boolean;
    /** Global product search on storefront */
    search: boolean;
    /** Inventory / stock tracking, low-stock badges, out-of-stock UI */
    inventory: boolean;
    /** SMS + email notifications on order events */
    notifications: boolean;
    /** Product reviews & star ratings */
    reviews: boolean;
    /** Discount / promo codes at checkout */
    discounts: boolean;
    /** PWA installability + push notifications */
    pwa: boolean;
};
/**
 * Server-side feature flags. Read once at module load.
 * In edge/serverless contexts this is re-evaluated per cold start.
 */
export declare const features: FeatureFlags;
/**
 * Client-safe feature flags — must use NEXT_PUBLIC_* env vars so they
 * are inlined at build time and available in the browser bundle.
 */
export declare const publicFeatures: FeatureFlags;
export type { FeatureFlags };
//# sourceMappingURL=features.d.ts.map