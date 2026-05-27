"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicFeatures = exports.features = void 0;
function readFlag(envValue, defaultValue = false) {
    if (envValue === undefined || envValue === '')
        return defaultValue;
    return envValue === 'true' || envValue === '1' || envValue === 'on';
}
/**
 * Server-side feature flags. Read once at module load.
 * In edge/serverless contexts this is re-evaluated per cold start.
 */
exports.features = {
    cmsContent: readFlag(process.env.FEATURE_CMS_CONTENT),
    search: readFlag(process.env.FEATURE_SEARCH),
    inventory: readFlag(process.env.FEATURE_INVENTORY),
    notifications: readFlag(process.env.FEATURE_NOTIFICATIONS),
    reviews: readFlag(process.env.FEATURE_REVIEWS),
    discounts: readFlag(process.env.FEATURE_DISCOUNTS),
    pwa: readFlag(process.env.FEATURE_PWA),
};
/**
 * Client-safe feature flags — must use NEXT_PUBLIC_* env vars so they
 * are inlined at build time and available in the browser bundle.
 */
exports.publicFeatures = {
    cmsContent: readFlag(process.env.NEXT_PUBLIC_FEATURE_CMS_CONTENT),
    search: readFlag(process.env.NEXT_PUBLIC_FEATURE_SEARCH),
    inventory: readFlag(process.env.NEXT_PUBLIC_FEATURE_INVENTORY),
    notifications: readFlag(process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS),
    reviews: readFlag(process.env.NEXT_PUBLIC_FEATURE_REVIEWS),
    discounts: readFlag(process.env.NEXT_PUBLIC_FEATURE_DISCOUNTS),
    pwa: readFlag(process.env.NEXT_PUBLIC_FEATURE_PWA),
};
//# sourceMappingURL=features.js.map