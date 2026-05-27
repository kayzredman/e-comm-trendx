import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _client: ReturnType<typeof postgres> | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (_db) return _db
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  _client = postgres(url, { max: 10 })
  _db = drizzle(_client, { schema })
  return _db
}

/**
 * Force-close the existing Postgres pool and create a fresh one.
 * Use to recover from a broken pool (network blip, restart, etc.).
 */
export async function reconnectDb(): Promise<void> {
  if (_client) {
    try { await _client.end({ timeout: 5 }) } catch { /* ignore */ }
  }
  _client = null
  _db = null
  getDb()
}

export type Db = ReturnType<typeof getDb>
export { schema }
