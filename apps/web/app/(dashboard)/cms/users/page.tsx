import { auth } from '@clerk/nextjs/server'
import { usersApi, type StaffUser, type UserRole } from '@/lib/api'
import UsersManager from './UsersManager'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let users: StaffUser[] = []
  let currentUser: StaffUser | null = null
  try {
    if (token) {
      [users, currentUser] = await Promise.all([
        usersApi.list(token),
        usersApi.me(token),
      ])
    }
  } catch {}

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Team & Access</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Manage who can access the system and what they can do
        </p>
      </div>
      <UsersManager initialUsers={users} currentUser={currentUser} />
    </div>
  )
}
