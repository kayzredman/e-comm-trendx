/**
 * Resend email provider stub.
 * To enable: set RESEND_API_KEY + EMAIL_FROM AND FEATURE_NOTIFICATIONS=true.
 */
export type EmailResult = { providerId: string }

export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'orders@trendmarga.com'

  if (!apiKey) {
    console.log(`[resend:noop] would send email to ${to}: ${subject}`)
    return { providerId: 'noop' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    throw new Error(`Resend email failed (${res.status}): ${await res.text()}`)
  }
  const json = await res.json() as { id?: string }
  return { providerId: json.id ?? 'unknown' }
}
