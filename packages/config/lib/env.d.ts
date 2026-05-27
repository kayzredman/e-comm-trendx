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
}, "strip", z.ZodTypeAny, {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    NODE_ENV: "development" | "staging" | "production";
    API_PORT: number;
    CLERK_WEBHOOK_SECRET?: string | undefined;
    WEB_URL?: string | undefined;
    STOREFRONT_URL?: string | undefined;
    RAILWAY_API_TOKEN?: string | undefined;
    RAILWAY_ENVIRONMENT_ID?: string | undefined;
    RAILWAY_API_SERVICE_ID?: string | undefined;
    RAILWAY_WEB_SERVICE_ID?: string | undefined;
    GOOGLE_MAPS_API_KEY?: string | undefined;
    REDIS_URL?: string | undefined;
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
}>;
export type Env = z.infer<typeof envSchema>;
export declare function validateEnv(): Env;
export { envSchema };
//# sourceMappingURL=env.d.ts.map