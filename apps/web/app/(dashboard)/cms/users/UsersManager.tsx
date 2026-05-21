'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { usersApi, type StaffUser, type UserRole } from '@/lib/api'

const ROLES: { value: UserRole; label: string; desc: string; color: string; bg: string }[] = [
  { value: 'OWNER',          label: 'Owner',          desc: 'Full access + user management', color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'MANAGER',        label: 'Manager',        desc: 'All CMS except user management', color: '#2563EB', bg: '#DBEAFE' },
  { value: 'CONTENT_EDITOR', label: 'Content Editor', desc: 'Products, categories & content', color: '#16A34A', bg: '#DCFCE7' },
  { value: 'ORDER_MANAGER',  label: 'Order Manager',  desc: 'Orders, customers & delivery',   color: '#EA580C', bg: '#FFEDD5' },
  { value: 'VIEWER',         label: 'Viewer',         desc: 'Read-only access',                color: '#6B7280', bg: '#F3F4F6' },
]

function RoleBadge({ role }: { role: UserRole }) {
  const r = ROLES.find(x => x.value === role) ?? { label: role, color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: r.bg, color: r.color }}
    >
      {r.label}
    </span>
  )
}

interface Props {
  initialUsers: StaffUser[]
  currentUser: StaffUser | null
}

export default function UsersManager({ initialUsers, currentUser }: Props) {
  const { getToken } = useAuth()
  const [users, setUsers] = useState<StaffUser[]>(initialUsers)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('VIEWER')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('VIEWER')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = currentUser?.role === 'OWNER'

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteResult(null)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const res = await usersApi.invite(inviteEmail.trim(), inviteRole, token)
      setInviteResult(
        res.type === 'invited'
          ? `Invitation sent to ${inviteEmail}`
          : `Role updated for existing user ${inviteEmail}`
      )
      setInviteEmail('')
      // Refresh list
      const updated = await usersApi.list(token)
      setUsers(updated)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to invite user')
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(userId: string) {
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const updated = await usersApi.updateRole(userId, editRole, token)
      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)))
      setEditingId(null)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(userId: string, userEmail: string) {
    if (!confirm(`Remove ${userEmail} from the system?`)) return
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await usersApi.remove(userId, token)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to remove user')
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Role legend */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5 mb-6">
        {ROLES.map(r => (
          <div
            key={r.value}
            className="rounded-xl border p-3"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <span className="text-xs font-bold block mb-0.5" style={{ color: r.color }}>{r.label}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.desc}</span>
          </div>
        ))}
      </div>

      {/* Invite section (OWNER only) */}
      {isOwner && (
        <div
          className="rounded-xl border p-5 mb-6"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Invite team member</h2>
            {!showInvite && (
              <button
                onClick={() => setShowInvite(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                + Invite
              </button>
            )}
          </div>

          {showInvite && (
            <form onSubmit={handleInvite} className="flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                <input
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm"
                  style={{
                    background: 'var(--color-page)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="px-3 py-2 rounded-lg border text-sm"
                  style={{
                    background: 'var(--color-page)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  {ROLES.filter(r => r.value !== 'OWNER').map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={inviting}
                  className="text-sm font-medium px-4 py-2 rounded-lg"
                  style={{ background: 'var(--color-primary)', color: '#fff', opacity: inviting ? 0.6 : 1 }}
                >
                  {inviting ? 'Sending…' : 'Send invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInvite(false); setInviteResult(null) }}
                  className="text-sm px-4 py-2 rounded-lg"
                  style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}
                >
                  Cancel
                </button>
              </div>
              {inviteResult && (
                <p className="text-sm" style={{ color: '#16A34A' }}>{inviteResult}</p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border px-4 py-3 mb-4 text-sm" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
          {error}
        </div>
      )}

      {/* Users list */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div
          className="px-5 py-3 border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}
        >
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            Team members · {users.length}
          </h2>
        </div>

        {users.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            No team members yet
          </p>
        ) : (
          users.map(user => {
            const isPendingSignup = user.clerkId.startsWith('pending_')
            const isEditing = editingId === user.id
            const isSelf = user.id === currentUser?.id

            return (
              <div
                key={user.id}
                className="flex items-center justify-between px-5 py-3.5 border-b last:border-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                      {user.name}
                      {isSelf && <span className="ml-1 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>(you)</span>}
                    </p>
                    {isPendingSignup && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#FEF9C3', color: '#CA8A04' }}>
                        Pending signup
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{user.email}</p>
                </div>

                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {isEditing ? (
                    <>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as UserRole)}
                        className="text-sm px-2 py-1 rounded-lg border"
                        style={{
                          background: 'var(--color-page)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRoleChange(user.id)}
                        disabled={saving}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}
                      >
                        {saving ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-2 py-1.5 rounded-lg"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <RoleBadge role={user.role as UserRole} />
                      {isOwner && !isSelf && (
                        <>
                          <button
                            onClick={() => { setEditingId(user.id); setEditRole(user.role as UserRole) }}
                            className="text-xs px-2.5 py-1 rounded-lg border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemove(user.id, user.email)}
                            className="text-xs px-2.5 py-1 rounded-lg"
                            style={{ background: '#FEF2F2', color: '#DC2626' }}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
