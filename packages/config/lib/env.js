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