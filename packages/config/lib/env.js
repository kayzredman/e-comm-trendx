"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    // Database
    DATABASE_URL: zod_1.z.string().url(),
    // Clerk
    CLERK_SECRET_KEY: zod_1.z.string().min(1),
    CLERK_WEBHOOK_SECRET: zod_1.z.string().optional(),
    // App
    NODE_ENV: zod_1.z.enum(['development', 'staging', 'production']).default('development'),
    API_PORT: zod_1.z.coerce.number().default(4000),
    // Service quality / health monitoring (optional)
    WEB_URL: zod_1.z.string().url().optional(),
    STOREFRONT_URL: zod_1.z.string().url().optional(),
    // Railway redeploy integration (optional — used by /health/services/restart in prod)
    RAILWAY_API_TOKEN: zod_1.z.string().optional(),
    RAILWAY_ENVIRONMENT_ID: zod_1.z.string().optional(),
    RAILWAY_API_SERVICE_ID: zod_1.z.string().optional(),
    RAILWAY_WEB_SERVICE_ID: zod_1.z.string().optional(),
    // Google Maps (optional in Phase 1)
    GOOGLE_MAPS_API_KEY: zod_1.z.string().optional(),
    // Redis (Phase 2)
    REDIS_URL: zod_1.z.string().optional(),
    // ── Image storage (R2 / S3-compatible) ──────────────────────────────────
    // When ALL R2_* are present, the API uses R2. Otherwise it falls back to
    // local disk storage at apps/api/uploads/ (dev only).
    R2_ACCOUNT_ID: zod_1.z.string().optional(),
    R2_ACCESS_KEY_ID: zod_1.z.string().optional(),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    R2_BUCKET: zod_1.z.string().optional(),
    /** Public base URL for the bucket (custom domain or r2.dev URL). No trailing slash. */
    R2_PUBLIC_URL: zod_1.z.string().url().optional(),
    /** Where the API serves locally-stored uploads from in dev. No trailing slash. */
    LOCAL_UPLOADS_BASE_URL: zod_1.z.string().url().optional(),
    /** Max single-image upload size in bytes (default 10MB). */
    IMAGE_MAX_BYTES: zod_1.z.coerce.number().default(10 * 1024 * 1024),
    // ── WhatsApp (Baileys) ────────────────────────────────────────────────────
    /** Master switch. When false (default), all messaging falls back to Hubtel SMS. */
    WHATSAPP_ENABLED: zod_1.z.coerce.boolean().default(false),
    /** Optional E.164 phone number for the business WhatsApp account (display only). */
    WHATSAPP_PHONE_NUMBER: zod_1.z.string().optional(),
    /** Throttle: minimum gap (ms) between outbound WA messages. */
    WHATSAPP_MIN_GAP_MS: zod_1.z.coerce.number().default(1000),
    // ── Paystack payments ─────────────────────────────────────────────────────
    /** Master switch. When false, online payment routes return 503 and storefront falls back to COD. */
    PAYSTACK_ENABLED: zod_1.z.coerce.boolean().default(false),
    /** sk_test_* or sk_live_*. Used for HMAC-SHA512 webhook signature too. */
    PAYSTACK_SECRET_KEY: zod_1.z.string().optional(),
    /** pk_test_* or pk_live_*. Exposed via /storefront/payments/config for inline JS. */
    PAYSTACK_PUBLIC_KEY: zod_1.z.string().optional(),
    /** Override Paystack base URL (testing/mocks). Defaults to https://api.paystack.co */
    PAYSTACK_API_BASE: zod_1.z.string().url().default('https://api.paystack.co'),
    /** Where Paystack redirects after card/MoMo flow finishes. Falls back to WEB_URL + /checkout/return. */
    PAYSTACK_CALLBACK_URL: zod_1.z.string().url().optional(),
    // ── Currency ──────────────────────────────────────────────────────────────
    /** ISO 4217 code used for orders, intents, refunds, and money formatting.
     *  Must be a Paystack-supported currency: GHS | NGN | ZAR | KES | USD. */
    STORE_CURRENCY: zod_1.z.enum(['GHS', 'NGN', 'ZAR', 'KES', 'USD']).default('GHS'),
    /** BCP-47 locale for Intl.NumberFormat. Defaults match STORE_CURRENCY country.
     *  Override only when you want a different number-grouping/locale convention. */
    STORE_LOCALE: zod_1.z.string().optional(),
    // ── Web Push (PWA notifications) ──────────────────────────────────────────
    /** Public VAPID key (base64url). Exposed via /v1/push/vapid-key for browsers. */
    VAPID_PUBLIC_KEY: zod_1.z.string().optional(),
    /** Private VAPID key (base64url). When missing, push send is disabled but
     *  subscribe/unsubscribe still work so the FE can warm up. */
    VAPID_PRIVATE_KEY: zod_1.z.string().optional(),
    /** mailto: or https:// contact for push providers. Defaults to mailto:ops@trendmarga.com. */
    VAPID_SUBJECT: zod_1.z.string().default('mailto:ops@trendmarga.com'),
    // ── Service Quality Tier 3: scheduled diagnostics + alerts ────────────────
    /** Master switch for the cron + alerting loop. When false, the loop never runs. */
    SQ_ALERTS_ENABLED: zod_1.z.coerce.boolean().default(false),
    /** Interval (minutes) between background diagnostic runs. */
    SQ_ALERT_INTERVAL_MIN: zod_1.z.coerce.number().min(1).default(5),
    /** Per-finding cooldown (minutes) before the same finding can re-alert. */
    SQ_ALERT_COOLDOWN_MIN: zod_1.z.coerce.number().min(1).default(60),
    /** Comma-separated E.164 phone numbers that receive SMS alerts. */
    SQ_ALERT_PHONES: zod_1.z.string().optional(),
    /** Comma-separated email addresses that receive email alerts. */
    SQ_ALERT_EMAILS: zod_1.z.string().optional(),
});
exports.envSchema = envSchema;
function validateEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.flatten().fieldErrors);
        process.exit(1);
    }
    return result.data;
}
//# sourceMappingURL=env.js.map