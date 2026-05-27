import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { healthApi, usersApi, type HealthReport, type StaffUser } from '@/lib/api'
import ServiceQualityClient from './ServiceQualityClient'

export const dynamic = 'force-dynamic'

const ELEVATED_ROLES: StaffUser['role'][] = ['OWNER', 'MANAGER']

export default async function ServiceQualityPage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) redirect('/sign-in')

  // Role gate — sidebar already hides this for non-elevated users, but enforce server-side too.
  let me: StaffUser | null = null
  try {
    me = await usersApi.me(token)
  } catch {
    // If we can't reach the API, fall through to the client — it will show the offline state.
  }
  if (me && !ELEVATED_ROLES.includes(me.role)) {
    redirect('/cms')
  }

  let initialReport: HealthReport | null = null
  try {
    initialReport = await healthApi.services(token)
  } catch {
    // API may be restarting — client will retry
  }

  return (
    <ServiceQualityClient
      initialReport={initialReport}
      token={token}
      currentRole={me?.role ?? null}
    />
  )
}
