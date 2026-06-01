import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
    CLERK_SECRET_KEY: z.ZodString;
    CLERK_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    API_PORT: z.ZodDefault<z.ZodNumber>;
    WEB_URL: z.ZodOptional<z.ZodString>;
    STOREFRONT_URL: z.ZodOptional<z.ZodString>;
    RAILWAY_API_TOKEN: z.ZodOptional<z.ZodString>;
    RAILWAY_ENVIRONMENT_ID: z.ZodOptional<z.ZodString>;
    RAILWAY_API_SERVICE_ID: z.ZodOptional<z.ZodString>;
    RAILWAY_WEB_SERVICE_ID: z.ZodOptional<z.ZodString>;
    GOOGLE_MAPS_API_KEY: z.ZodOptional<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    R2_ACCOUNT_ID: z.ZodOptional<z.ZodString>;
    R2_ACCESS_KEY_ID: z.ZodOptional<z.ZodString>;
    R2_SECRET_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    R2_BUCKET: z.ZodOptional<z.ZodString>;
    /** Public base URL for the bucket (custom domain or r2.dev URL). No trailing slash. */
    R2_PUBLIC_URL: z.ZodOptional<z.ZodString>;
    /** Where the API serves locally-stored uploads from in dev. No trailing slash. */
    LOCAL_UPLOADS_BASE_URL: z.ZodOptional<z.ZodString>;
    /** Max single-image upload size in bytes (default 10MB). */
    IMAGE_MAX_BYTES: z.ZodDefault<z.ZodNumber>;
    /** Master switch. When false (default), all messaging falls back to Hubtel SMS. */
    WHATSAPP_ENABLED: z.ZodDefault<z.ZodBoolean>;
    /** Optional E.164 phone number for the business WhatsApp account (display only). */
    WHATSAPP_PHONE_NUMBER: z.ZodOptional<z.ZodString>;
    /** Throttle: minimum gap (ms) between outbound WA messages. */
    WHATSAPP_MIN_GAP_MS: z.ZodDefault<z.ZodNumber>;
    /** Master switch. When false, online payment routes return 503 and storefront falls back to COD. */
    PAYSTACK_ENABLED: z.ZodDefault<z.ZodBoolean>;
    /** sk_test_* or sk_live_*. Used for HMAC-SHA512 webhook signature too. */
    PAYSTACK_SECRET_KEY: z.ZodOptional<z.ZodString>;
    /** pk_test_* or pk_live_*. Exposed via /storefront/payments/config for inline JS. */
    PAYSTACK_PUBLIC_KEY: z.ZodOptional<z.ZodString>;
    /** Override Paystack base URL (testing/mocks). Defaults to https://api.paystack.co */
    PAYSTACK_API_BASE: z.ZodDefault<z.ZodString>;
    /** Where Paystack redirects after card/MoMo flow finishes. Falls back to WEB_URL + /checkout/return. */
    PAYSTACK_CALLBACK_URL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    NODE_ENV: "development" | "staging" | "production";
    API_PORT: number;
    IMAGE_MAX_BYTES: number;
    WHATSAPP_ENABLED: boolean;
    WHATSAPP_MIN_GAP_MS: number;
    PAYSTACK_ENABLED: boolean;
    PAYSTACK_API_BASE: string;
    CLERK_WEBHOOK_SECRET?: string | undefined;
    WEB_URL?: string | undefined;
    STOREFRONT_URL?: string | undefined;
    RAILWAY_API_TOKEN?: string | undefined;
    RAILWAY_ENVIRONMENT_ID?: string | undefined;
    RAILWAY_API_SERVICE_ID?: string | undefined;
    RAILWAY_WEB_SERVICE_ID?: string | undefined;
    GOOGLE_MAPS_API_KEY?: string | undefined;
    REDIS_URL?: string | undefined;
    R2_ACCOUNT_ID?: string | undefined;
    R2_ACCESS_KEY_ID?: string | undefined;
    R2_SECRET_ACCESS_KEY?: string | undefined;
    R2_BUCKET?: string | undefined;
    R2_PUBLIC_URL?: string | undefined;
    LOCAL_UPLOADS_BASE_URL?: string | undefined;
    WHATSAPP_PHONE_NUMBER?: string | undefined;
    PAYSTACK_SECRET_KEY?: string | undefined;
    PAYSTACK_PUBLIC_KEY?: string | undefined;
    PAYSTACK_CALLBACK_URL?: string | undefined;
}, {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    CLERK_WEBHOOK_SECRET?: string | undefined;
    NODE_ENV?: "development" | "staging" | "production" | undefined;
    API_PORT?: number | undefined;
    WEB_URL?: string | undefined;
    STOREFRONT_URL?: string | undefined;
    RAILWAY_API_TOKEN?: string | undefined;
    RAILWAY_ENVIRONMENT_ID?: string | undefined;
    RAILWAY_API_SERVICE_ID?: string | undefined;
    RAILWAY_WEB_SERVICE_ID?: string | undefined;
    GOOGLE_MAPS_API_KEY?: string | undefined;
    REDIS_URL?: string | undefined;
    R2_ACCOUNT_ID?: string | undefined;
    R2_ACCESS_KEY_ID?: string | undefined;
    R2_SECRET_ACCESS_KEY?: string | undefined;
    R2_BUCKET?: string | undefined;
    R2_PUBLIC_URL?: string | undefined;
    LOCAL_UPLOADS_BASE_URL?: string | undefined;
    IMAGE_MAX_BYTES?: number | undefined;
    WHATSAPP_ENABLED?: boolean | undefined;
    WHATSAPP_PHONE_NUMBER?: string | undefined;
    WHATSAPP_MIN_GAP_MS?: number | undefined;
    PAYSTACK_ENABLED?: boolean | undefined;
    PAYSTACK_SECRET_KEY?: string | undefined;
    PAYSTACK_PUBLIC_KEY?: string | undefined;
    PAYSTACK_API_BASE?: string | undefined;
    PAYSTACK_CALLBACK_URL?: string | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
export declare function validateEnv(): Env;
export { envSchema };
//# sourceMappingURL=env.d.ts.map