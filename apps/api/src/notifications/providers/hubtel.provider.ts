/**
 * Hubtel SMS provider stub.
 * Sends a single SMS via the Hubtel HTTP API.
 *
 * Returns providerId (Hubtel message id) on success.
 * Throws on failure — caller is responsible for retry/queue logic.
 *
 * To enable: set HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, HUBTEL_SENDER_ID env vars
 * AND FEATURE_NOTIFICATIONS=true.
 */
export type SmsResult = { providerId: string }

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const clientId = process.env.HUBTEL_CLIENT_ID
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET
  const sender = process.env.HUBTEL_SENDER_ID || 'TrendMarga'

  if (!clientId || !clientSecret) {
    // No-op in environments without credentials — log only.
    console.log(`[hubtel:noop] would send SMS to ${to}: ${message}`)
    return { providerId: 'noop' }
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const url = new URL('https://smsc.hubtel.com/v1/messages/send')
  url.searchParams.set('From', sender)
  url.searchParams.set('To', to)
  url.searchParams.set('Content', message)

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!res.ok) {
    throw new Error(`Hubtel SMS failed (${res.status}): ${await res.text()}`)
  }
  const json = await res.json() as { MessageId?: string }
  return { providerId: json.MessageId ?? 'unknown' }
}
