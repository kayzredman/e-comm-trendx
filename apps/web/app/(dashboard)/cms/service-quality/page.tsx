import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { healthApi, usersApi, type HealthReport, type StaffUser } from '@/lib/api'
import ServiceQualityClient from './ServiceQualityClient'

export const dynamic = 'force-dynamic'

const ELEVATED_ROLES: StaffUser['role'][] = ['OWNER', 'MANAGER']

export default async function ServiceQualityPage() {
  // Auth — if Clerk itself is dying we still want the page to render an offline shell.
  let token: string | null = null
  try {
    const a = await auth()
    token = await a.getToken()
  } catch {
    // Clerk down — render with no token; the client will surface the error
  }
  if (!token) {
    // Only redirect when Clerk is healthy enough to tell us there's no session.
    try {
      const a = await auth()
      if (!a.userId) redirect('/sign-in')
    } catch {
      // swallow — render offline shell
    }
  }

  // Role gate — sidebar already hides this for non-elevated users, but enforce server-side too.
  let me: StaffUser | null = null
  if (token) {
    try {
      me = await usersApi.me(token)
    } catch {
      // If we can't reach the API, fall through to the client — it will show the offline state.
    }
  }
  if (me && !ELEVATED_ROLES.includes(me.role)) {
    redirect('/cms')
  }

  let initialReport: HealthReport | null = null
  if (token) {
    try {
      initialReport = await healthApi.services(token)
    } catch {
      // API may be restarting — client will retry
    }
  }

  return (
    <ServiceQualityClient
      initialReport={initialReport}
      token={token ?? ''}
      currentRole={me?.role ?? null}
    />
  )
}
