import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Clerk
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // App
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),

  // Service quality / health monitoring (optional)
  WEB_URL: z.string().url().optional(),
  STOREFRONT_URL: z.string().url().optional(),

  // Railway redeploy integration (optional — used by /health/services/restart in prod)
  RAILWAY_API_TOKEN: z.string().optional(),
  RAILWAY_ENVIRONMENT_ID: z.string().optional(),
  RAILWAY_API_SERVICE_ID: z.string().optional(),
  RAILWAY_WEB_SERVICE_ID: z.string().optional(),

  // Google Maps (optional in Phase 1)
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // Redis (Phase 2)
  REDIS_URL: z.string().optional(),

  // ── Image storage (R2 / S3-compatible) ──────────────────────────────────
  // When ALL R2_* are present, the API uses R2. Otherwise it falls back to
  // local disk storage at apps/api/uploads/ (dev only).
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  /** Public base URL for the bucket (custom domain or r2.dev URL). No trailing slash. */
  R2_PUBLIC_URL: z.string().url().optional(),
  /** Where the API serves locally-stored uploads from in dev. No trailing slash. */
  LOCAL_UPLOADS_BASE_URL: z.string().url().optional(),
  /** Max single-image upload size in bytes (default 10MB). */
  IMAGE_MAX_BYTES: z.coerce.number().default(10 * 1024 * 1024),

  // ── WhatsApp (Baileys) ────────────────────────────────────────────────────
  /** Master switch. When false (default), all messaging falls back to Hubtel SMS. */
  WHATSAPP_ENABLED: z.coerce.boolean().default(false),
  /** Optional E.164 phone number for the business WhatsApp account (display only). */
  WHATSAPP_PHONE_NUMBER: z.string().optional(),
  /** Throttle: minimum gap (ms) between outbound WA messages. */
  WHATSAPP_MIN_GAP_MS: z.coerce.number().default(1000),

  // ── Paystack payments ─────────────────────────────────────────────────────
  /** Master switch. When false, online payment routes return 503 and storefront falls back to COD. */
  PAYSTACK_ENABLED: z.coerce.boolean().default(false),
  /** sk_test_* or sk_live_*. Used for HMAC-SHA512 webhook signature too. */
  PAYSTACK_SECRET_KEY: z.string().optional(),
  /** pk_test_* or pk_live_*. Exposed via /storefront/payments/config for inline JS. */
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  /** Override Paystack base URL (testing/mocks). Defaults to https://api.paystack.co */
  PAYSTACK_API_BASE: z.string().url().default('https://api.paystack.co'),
  /** Where Paystack redirects after card/MoMo flow finishes. Falls back to WEB_URL + /checkout/return. */
  PAYSTACK_CALLBACK_URL: z.string().url().optional(),

  // ── Currency ──────────────────────────────────────────────────────────────
  /** ISO 4217 code used for orders, intents, refunds, and money formatting.
   *  Must be a Paystack-supported currency: GHS | NGN | ZAR | KES | USD. */
  STORE_CURRENCY: z.enum(['GHS', 'NGN', 'ZAR', 'KES', 'USD']).default('GHS'),
  /** BCP-47 locale for Intl.NumberFormat. Defaults match STORE_CURRENCY country.
   *  Override only when you want a different number-grouping/locale convention. */
  STORE_LOCALE: z.string().optional(),

  // ── Web Push (PWA notifications) ──────────────────────────────────────────
  /** Public VAPID key (base64url). Exposed via /v1/push/vapid-key for browsers. */
  VAPID_PUBLIC_KEY: z.string().optional(),
  /** Private VAPID key (base64url). When missing, push send is disabled but
   *  subscribe/unsubscribe still work so the FE can warm up. */
  VAPID_PRIVATE_KEY: z.string().optional(),
  /** mailto: or https:// contact for push providers. Defaults to mailto:ops@trendmarga.com. */
  VAPID_SUBJECT: z.string().default('mailto:ops@trendmarga.com'),

  // ── Service Quality Tier 3: scheduled diagnostics + alerts ────────────────
  /** Master switch for the cron + alerting loop. When false, the loop never runs. */
  SQ_ALERTS_ENABLED: z.coerce.boolean().default(false),
  /** Interval (minutes) between background diagnostic runs. */
  SQ_ALERT_INTERVAL_MIN: z.coerce.number().min(1).default(5),
  /** Per-finding cooldown (minutes) before the same finding can re-alert. */
  SQ_ALERT_COOLDOWN_MIN: z.coerce.number().min(1).default(60),
  /** Comma-separated E.164 phone numbers that receive SMS alerts. */
  SQ_ALERT_PHONES: z.string().optional(),
  /** Comma-separated email addresses that receive email alerts. */
  SQ_ALERT_EMAILS: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }
  return result.data
}

export { envSchema }
