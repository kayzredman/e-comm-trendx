import * as schema from './schema';
export declare function getDb(): import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export type Db = ReturnType<typeof getDb>;
export { schema };
//# sourceMappingURL=client.d.ts.map