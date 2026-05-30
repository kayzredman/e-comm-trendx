/**
 * Courier PWA API client. Token is held in localStorage.
 * All endpoints under /courier on the API.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

const TOKEN_KEY = 'tm:courier:token'
const COURIER_KEY = 'tm:courier:profile'

export type CourierProfile = {
  id: string
  name: string
  phone: string
  vehicle: string | null
  employmentType: 'FLEET' | 'FREELANCE'
  commissionPct?: string | null
  momoNumber?: string | null
}

export type CourierAddress = {
  street: string
  city: string
  region: string
  country: string
  zip: string | null
}

export type CourierJob = {
  assignmentId: string
  orderId: string
  status: 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED'
  assignedAt: string
  pickedUpAt: string | null
  deliveredAt: string | null
  failedAt: string | null
  failureReason: string | null
  commissionAmount: string
  order: {
    id: string
    status: string
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
    paymentMethod: 'CASH_ON_DELIVERY' | 'MOBILE_MONEY' | 'CARD' | 'CASH'
    total: string
    subtotal: string
    deliveryFee: string
    notes: string | null
    createdAt: string
  } | null
  customer: { name: string; phone: string; address: CourierAddress } | null
  zone: { id: string; name: string } | null
}

export type CourierJobDetail = CourierJob & {
  items: Array<{ id: string; productName: string; variantLabel: string | null; unitPrice: string; quantity: number }>
}

export type EarningsPayload = {
  courier: CourierProfile | null
  cycle: {
    from: string; to: string
    delivered: number; failed: number
    earned: string; revenue: string
  }
  owed: string
  lastPayout: {
    id: string; amount: string; method: 'MOMO' | 'CASH' | 'BANK'
    paidAt: string; deliveryCount: number; reference: string | null
  } | null
  recent: Array<{ assignmentId: string; orderId: string; amount: string; deliveredAt: string | null }>
}

export const courierAuth = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  },
  getProfile(): CourierProfile | null {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(COURIER_KEY)
    return raw ? JSON.parse(raw) as CourierProfile : null
  },
  setSession(token: string, profile: CourierProfile) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(COURIER_KEY, JSON.stringify(profile))
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(COURIER_KEY)
  },
}

async function call<T = unknown>(path: string, opts?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts?.body != null) headers['Content-Type'] = 'application/json'
  if (opts?.auth) {
    const t = courierAuth.getToken()
    if (!t) throw new Error('NO_SESSION')
    headers['Authorization'] = `Bearer ${t}`
  }
  const { auth: _a, ...rest } = opts ?? {}
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: { ...headers, ...(rest.headers as Record<string, string> ?? {}) },
    signal: rest.signal ?? AbortSignal.timeout(10_000),
  })
  if (res.status === 401) {
    courierAuth.clear()
    throw new Error('NO_SESSION')
  }
  if (!res.ok) {
    let msg = `API ${res.status}`
    try { const b = await res.json(); msg = (b as any).message ?? msg } catch {}
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const courierApi = {
  requestOtp: (phone: string) =>
    call<{ ok: boolean; courierName: string; expiresInMin: number }>('/courier/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string) =>
    call<{ token: string; expiresAt: string; courier: CourierProfile }>('/courier/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  signOut: () =>
    call<{ ok: boolean }>('/courier/auth/sign-out', { method: 'POST', auth: true }).finally(() => courierAuth.clear()),

  me: () => call<CourierProfile>('/courier/me', { auth: true }),

  jobs: () => call<CourierJob[]>('/courier/jobs', { auth: true }),
  history: () => call<CourierJob[]>('/courier/jobs/history', { auth: true }),
  job: (orderId: string) => call<CourierJobDetail>(`/courier/jobs/${orderId}`, { auth: true }),
  pickup: (orderId: string) => call(`/courier/jobs/${orderId}/pickup`, { method: 'POST', auth: true }),
  deliver: (orderId: string, code: string) =>
    call(`/courier/jobs/${orderId}/deliver`, {
      method: 'POST', auth: true,
      body: JSON.stringify({ code }),
    }),
  fail: (orderId: string, reason: string) =>
    call(`/courier/jobs/${orderId}/fail`, {
      method: 'POST', auth: true,
      body: JSON.stringify({ reason }),
    }),

  earnings: () => call<EarningsPayload>('/courier/earnings', { auth: true }),
}
