const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

async function apiFetch<T = unknown>(
  path: string,
  opts?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts?.token) headers['Authorization'] = `Bearer ${opts.token}`

  const { token: _token, ...rest } = opts ?? {}
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers,
    signal: rest.signal ?? AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Categories ───────────────────────────────────────────────────────────────

export type Category = {
  id: string
  name: string
  slug: string
  parentId: string | null
  imageUrl: string | null
  createdAt: string
  children?: Category[]
  products?: Product[]
}

export const categoriesApi = {
  list: (): Promise<Category[]> => apiFetch('/categories'),
  get: (id: string): Promise<Category> => apiFetch(`/categories/${id}`),
  getBySlug: (slug: string): Promise<Category | null> => (apiFetch(`/categories/slug/${slug}`) as Promise<Category>).catch(() => null),
  create: (data: Partial<Category>, token: string) =>
    apiFetch('/categories', { method: 'POST', body: JSON.stringify(data), token }),
  update: (id: string, data: Partial<Category>, token: string) =>
    apiFetch(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: (id: string, token: string) =>
    apiFetch(`/categories/${id}`, { method: 'DELETE', token }),
}

// ─── Products ─────────────────────────────────────────────────────────────────

export type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  price: string
  comparePrice: string | null
  sku: string | null
  inventory: number
  categoryId: string | null
  images: string[]
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  category?: Category | null
}

export type ProductInput = {
  name: string
  slug: string
  description?: string
  price: string
  comparePrice?: string
  sku?: string
  inventory?: number
  categoryId?: string
  images?: string[]
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
}

export const productsApi = {
  list: (params?: { status?: string; categoryId?: string; search?: string }): Promise<Product[]> => {
    const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : ''
    return apiFetch(`/products${qs}`)
  },
  get: (id: string): Promise<Product> => apiFetch(`/products/${id}`),
  getBySlug: (slug: string): Promise<Product> => apiFetch(`/products/slug/${slug}`),
  create: (data: ProductInput, token: string): Promise<Product> =>
    apiFetch('/products', { method: 'POST', body: JSON.stringify(data), token }),
  update: (id: string, data: Partial<ProductInput>, token: string): Promise<Product> =>
    apiFetch(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: (id: string, token: string) =>
    apiFetch(`/products/${id}`, { method: 'DELETE', token }),
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

export type OrderItem = {
  id: string
  orderId: string
  productId: string
  productName: string
  unitPrice: string
  quantity: number
}

export type Order = {
  id: string
  customerId: string
  status: OrderStatus
  subtotal: string
  deliveryFee: string
  total: string
  notes: string | null
  paymentMethod: 'CASH_ON_DELIVERY' | 'MOBILE_MONEY' | 'CARD'
  createdAt: string
  updatedAt: string
  customer?: Customer
  items?: OrderItem[]
}

export const ordersApi = {
  list: (token: string): Promise<Order[]> => apiFetch('/orders', { token }),
  get: (id: string, token: string): Promise<Order> => apiFetch(`/orders/${id}`, { token }),
  updateStatus: (id: string, status: OrderStatus, token: string): Promise<Order> =>
    apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }), token }),
}

// ─── Customers ────────────────────────────────────────────────────────────────

export type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  address: {
    street: string
    city: string
    region: string
    country: string
    zip: string | null
  }
  createdAt: string
  orders?: Order[]
}

export const customersApi = {
  list: (token: string): Promise<Customer[]> => apiFetch('/customers', { token }),
  get: (id: string, token: string): Promise<Customer> => apiFetch(`/customers/${id}`, { token }),
}

// ─── Delivery Zones ───────────────────────────────────────────────────────────

export type FeeStrategy = 'FLAT' | 'DISTANCE_BASED' | 'FREE_THRESHOLD' | 'COMBINED'

export type DeliveryZone = {
  id: string
  name: string
  baseFee: string
  feeStrategy: FeeStrategy
  feePerKm: string | null
  freeThreshold: string | null
  isActive: boolean
}

export const deliveryApi = {
  listAll: (token: string): Promise<DeliveryZone[]> => apiFetch('/delivery/zones/all', { token }),
  upsert: (data: Partial<DeliveryZone> & { name: string; baseFee: string }, token: string): Promise<DeliveryZone> =>
    apiFetch('/delivery/zones', { method: 'POST', body: JSON.stringify(data), token }),
  delete: (id: string, token: string) =>
    apiFetch(`/delivery/zones/${id}`, { method: 'DELETE', token }),
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type DashboardStats = {
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  revenue30d: string
  revenueAll: string
  avgOrderValue: string
  completionRate: number
  recentOrders: Order[]
  lowStockProducts: Product[]
  ordersByStatus: Partial<Record<string, number>>
  revenueByDay: Array<{ date: string; revenue: string }>
  topProducts: Array<{ productId: string; productName: string; totalRevenue: string; unitsSold: number }>
}

export const analyticsApi = {
  dashboard: (token: string): Promise<DashboardStats> => apiFetch('/analytics/dashboard', { token }),
}

// ─── Health / Service Quality ─────────────────────────────────────────────────

export type ServiceStatus = 'healthy' | 'degraded' | 'down'

export interface ServiceCheck {
  name: string
  status: ServiceStatus
  latencyMs: number | null
  message: string
  checkedAt: string
}

export interface HealthReport {
  overall: ServiceStatus
  services: ServiceCheck[]
  serverUptimeSeconds: number
  memoryMB: { used: number; total: number; percent: number }
  checkedAt: string
}

export const healthApi = {
  ping: (): Promise<{ status: string; ts: string }> =>
    apiFetch('/health'),
  services: (token: string): Promise<HealthReport> =>
    apiFetch('/health/services', { token }),
  reconnectDb: (token: string): Promise<{ triggered: boolean; result: ServiceCheck }> =>
    apiFetch('/health/services/reconnect-db', { method: 'POST', body: '{}', token }),
}

// ─── Users / RBAC ─────────────────────────────────────────────────────────────

export type UserRole = 'OWNER' | 'MANAGER' | 'CONTENT_EDITOR' | 'ORDER_MANAGER' | 'VIEWER' | 'STAFF'

export type StaffUser = {
  id: string
  clerkId: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export const usersApi = {
  sync: (token: string): Promise<StaffUser> =>
    apiFetch('/users/sync', { method: 'POST', body: JSON.stringify({}), token }),
  me: (token: string): Promise<StaffUser> =>
    apiFetch('/users/me', { token }),
  list: (token: string): Promise<StaffUser[]> =>
    apiFetch('/users', { token }),
  invite: (email: string, role: UserRole, token: string): Promise<{ type: 'invited' | 'updated'; user: StaffUser }> =>
    apiFetch<{ type: 'invited' | 'updated'; user: StaffUser }>('/users/invite', { method: 'POST', body: JSON.stringify({ email, role }), token }),
  updateRole: (id: string, role: UserRole, token: string): Promise<StaffUser> =>
    apiFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }), token }),
  remove: (id: string, token: string): Promise<{ deleted: boolean }> =>
    apiFetch(`/users/${id}`, { method: 'DELETE', token }),
}

// ─── CMS Sections ─────────────────────────────────────────────────────────────

export type SectionType = 'HERO' | 'FEATURED' | 'BANNER' | 'ANNOUNCEMENT'
export type SectionPage = 'HOME' | 'SHOP'

export type CmsSection = {
  id: string
  page: SectionPage
  type: SectionType
  data: Record<string, unknown>
  order: number
  isActive: boolean
}

export const cmsApi = {
  getSections: (page: SectionPage, token: string): Promise<CmsSection[]> =>
    apiFetch(`/cms/sections?page=${page}`, { token }),
  upsertSection: (data: Partial<CmsSection> & { page: SectionPage; type: SectionType }, token: string): Promise<CmsSection> =>
    apiFetch('/cms/sections', { method: 'POST', body: JSON.stringify(data), token }),
  deleteSection: (id: string, token: string): Promise<void> =>
    apiFetch(`/cms/sections/${id}`, { method: 'DELETE', token }),
}

// ─── Storefront (public v1 endpoints) ─────────────────────────────────────────

export type PlaceOrderInput = {
  customer: {
    name: string
    phone: string
    email?: string
    address: { street: string; city: string; region: string; country: string; zip?: string }
  }
  items: Array<{ productId: string; productName: string; unitPrice: number; quantity: number }>
  zoneId: string
  notes?: string
  paymentMethod?: 'CASH_ON_DELIVERY' | 'MOBILE_MONEY' | 'CARD'
  subtotal: number
  deliveryFee: number
  total: number
}

export const storefrontApi = {
  getDeliveryZones: (): Promise<DeliveryZone[]> => apiFetch('/v1/delivery-zones'),
  getDeliveryFee: (zoneId: string, total: number, km?: number): Promise<number> => {
    const params = new URLSearchParams({ zoneId, total: String(total) })
    if (km !== undefined) params.set('km', String(km))
    return apiFetch(`/delivery/fee?${params}`)
  },
  placeOrder: (body: PlaceOrderInput): Promise<Order> =>
    apiFetch('/v1/orders', { method: 'POST', body: JSON.stringify(body) }),
  getOrder: (id: string): Promise<Order & { customer?: Customer; items?: OrderItem[] }> =>
    apiFetch(`/v1/orders/${id}`),
}
