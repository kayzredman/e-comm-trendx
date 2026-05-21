'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { productsApi } from '@/lib/api'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function ProductDeleteButton({ id, name }: { id: string; name: string }) {
  const { getToken } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await productsApi.delete(id, token)
      router.refresh()
    } catch (err: any) {
      alert(err.message ?? 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-50"
      style={{ borderColor: '#FCA5A5', color: 'var(--color-error)' }}
    >
      <Trash2 size={13} /> {loading ? '…' : 'Delete'}
    </button>
  )
}
