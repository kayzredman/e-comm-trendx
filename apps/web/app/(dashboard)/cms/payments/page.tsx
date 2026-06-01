import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import {
  paymentsAdminApi,
  usersApi,
  type PaymentConfig,
  type PaymentStats,
  type PaymentIntentRow,
  type StaffUser,
} from '@/lib/api'
import PaymentsClient from './PaymentsClient'

export const dynamic = 'force-dynamic'

const ELEVATED_ROLES: StaffUser['role'][] = ['OWNER', 'MANAGER', 'ORDER_MANAGER']

export default async function PaymentsAdminPage() {
  let token: string | null = null
  try {
    const a = await auth()
    token = await a.getToken()
    if (!token) {
      if (!a.userId) redirect('/sign-in')
    }
  } catch {
    // Clerk down — render client shell which will surface error
  }

  let me: StaffUser | null = null
  if (token) {
    try { me = await usersApi.me(token) } catch { /* keep going */ }
  }
  if (me && !ELEVATED_ROLES.includes(me.role)) redirect('/cms')

  let initialStats: PaymentStats | null = null
  let initialConfig: PaymentConfig | null = null
  let initialIntents: PaymentIntentRow[] = []
  if (token) {
    const [s, c, i] = await Promise.all([
      paymentsAdminApi.stats(token).catch(() => null),
      paymentsAdminApi.config(token).catch(() => null),
      paymentsAdminApi.intents(token, undefined, 50).catch(() => []),
    ])
    initialStats = s
    initialConfig = c
    initialIntents = i
  }

  return (
    <PaymentsClient
      token={token ?? ''}
      initialStats={initialStats}
      initialConfig={initialConfig}
      initialIntents={initialIntents}
    />
  )
}
