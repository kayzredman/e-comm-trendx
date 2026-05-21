import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres: typeof import('postgres').default = require('postgres')

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

export type Db = ReturnType<typeof getDb>
export { schema }
