import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
    CLERK_SECRET_KEY: z.ZodString;
    CLERK_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    API_PORT: z.ZodDefault<z.ZodNumber>;
    GOOGLE_MAPS_API_KEY: z.ZodOptional<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    NODE_ENV: "development" | "staging" | "production";
    API_PORT: number;
    CLERK_WEBHOOK_SECRET?: string | undefined;
    GOOGLE_MAPS_API_KEY?: string | undefined;
    REDIS_URL?: string | undefined;
}, {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    CLERK_WEBHOOK_SECRET?: string | undefined;
    NODE_ENV?: "development" | "staging" | "production" | undefined;
    API_PORT?: number | undefined;
    GOOGLE_MAPS_API_KEY?: string | undefined;
    REDIS_URL?: string | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
export declare function validateEnv(): Env;
export { envSchema };
//# sourceMappingURL=env.d.ts.map