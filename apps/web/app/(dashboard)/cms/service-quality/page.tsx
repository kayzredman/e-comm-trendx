import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { healthApi } from '@/lib/api'
import ServiceQualityClient from './ServiceQualityClient'

export const dynamic = 'force-dynamic'

export default async function ServiceQualityPage() {
  const { getToken, sessionClaims } = await auth()

  // Only OWNER or MANAGER may access this page
  const token = await getToken()
  if (!token) redirect('/sign-in')

  let initialReport = null
  try {
    initialReport = await healthApi.services(token)
  } catch {
    // API may be restarting — client will retry
  }

  return <ServiceQualityClient initialReport={initialReport} token={token} />
}
