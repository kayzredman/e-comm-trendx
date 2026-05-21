import { auth } from '@clerk/nextjs/server'
import { cmsApi, type CmsSection } from '@/lib/api'
import SectionManager from './SectionManager'

export const dynamic = 'force-dynamic'

export default async function ContentPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let sections: CmsSection[] = []
  try {
    if (token) sections = await cmsApi.getSections('HOME', token)
  } catch { /* API not running */ }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Content
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Manage homepage sections — banners, featured areas, and announcements
        </p>
      </div>
      <SectionManager initialSections={sections} />
    </div>
  )
}
