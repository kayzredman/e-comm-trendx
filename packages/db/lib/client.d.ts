import * as schema from './schema';
export declare function getDb(): import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
/**
 * Force-close the existing Postgres pool and create a fresh one.
 * Use to recover from a broken pool (network blip, restart, etc.).
 */
export declare function reconnectDb(): Promise<void>;
export type Db = ReturnType<typeof getDb>;
export { schema };
//# sourceMappingURL=client.d.ts.map