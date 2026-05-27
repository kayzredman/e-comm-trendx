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
