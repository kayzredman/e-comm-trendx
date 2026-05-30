/**
 * Postgres-backed Baileys auth-state adapter.
 *
 * Baileys writes one blob for `creds` plus dozens of small per-key blobs
 * (pre-keys, sessions, app-state-sync-keys, sender-keys, …). We store them
 * all in a single `whatsapp_auth_state` key/value table so the session
 * survives container restarts and redeploys.
 */
import type { DbService } from '../db/db.service'
import { whatsappAuthState } from '@trendmarga/db'
import { eq, like, inArray } from 'drizzle-orm'
import {
  initAuthCreds,
  BufferJSON,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys'

type Reviver = (this: unknown, key: string, value: unknown) => unknown

export interface DbAuthState {
  state: AuthenticationState
  saveCreds: () => Promise<void>
  /** Wipes every row — call on logout/disconnect. */
  clear: () => Promise<void>
}

export async function useDbAuthState(db: DbService): Promise<DbAuthState> {
  const writeKey = async (key: string, value: unknown) => {
    const json = JSON.parse(JSON.stringify(value, BufferJSON.replacer))
    await db.client
      .insert(whatsappAuthState)
      .values({ key, value: json, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: whatsappAuthState.key,
        set: { value: json, updatedAt: new Date() },
      })
  }

  const readKey = async <T = unknown>(key: string): Promise<T | null> => {
    const [row] = await db.client
      .select()
      .from(whatsappAuthState)
      .where(eq(whatsappAuthState.key, key))
      .limit(1)
    if (!row) return null
    return JSON.parse(JSON.stringify(row.value), BufferJSON.reviver as Reviver) as T
  }

  const removeKeys = async (keys: string[]) => {
    if (keys.length === 0) return
    await db.client.delete(whatsappAuthState).where(inArray(whatsappAuthState.key, keys))
  }

  const creds: AuthenticationCreds = (await readKey<AuthenticationCreds>('creds')) ?? initAuthCreds()

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const data: { [id: string]: SignalDataTypeMap[T] } = {}
        await Promise.all(
          ids.map(async (id) => {
            let value = await readKey<SignalDataTypeMap[T]>(`${type}-${id}`)
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value as object) as unknown as SignalDataTypeMap[T]
            }
            if (value !== null && value !== undefined) {
              data[id] = value
            }
          }),
        )
        return data
      },
      set: async (data) => {
        const writes: Promise<void>[] = []
        const deletes: string[] = []
        for (const category of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
          const bucket = data[category]
          if (!bucket) continue
          for (const id of Object.keys(bucket)) {
            const value = (bucket as Record<string, unknown>)[id]
            const key = `${category}-${id}`
            if (value) writes.push(writeKey(key, value))
            else deletes.push(key)
          }
        }
        await Promise.all([...writes, removeKeys(deletes)])
      },
    },
  }

  return {
    state,
    saveCreds: () => writeKey('creds', creds),
    clear: async () => {
      // Wipe all rows — both 'creds' and every namespaced key.
      await db.client.delete(whatsappAuthState).where(like(whatsappAuthState.key, '%'))
    },
  }
}
