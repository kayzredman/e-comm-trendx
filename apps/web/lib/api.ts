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
  customerId: string | null
  status: OrderStatus
  source?: 'ONLINE' | 'POS'
  subtotal: string
  deliveryFee: string
  discountAmount?: string
  taxAmount?: string
  total: string
  notes: string | null
  paymentMethod: 'CASH_ON_DELIVERY' | 'MOBILE_MONEY' | 'CARD' | 'CASH'
  cashierId?: string | null
  shiftId?: string | null
  registerId?: string | null
  tenderedAmount?: string | null
  changeAmount?: string | null
  receiptNumber?: string | null
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
  deliveryPipeline: {
    confirmed: number
    processing: number
    outForDelivery: number
    deliveredToday: number
  }
  activeDeliveries: Array<{
    id: string
    status: string
    total: string
    updatedAt: string
    createdAt: string
    customerName: string
    city: string | null
    region: string | null
  }>
}

export const analyticsApi = {
  dashboard: (token: string): Promise<DashboardStats> => apiFetch('/analytics/dashboard', { token }),
}

// ─── Health / Service Quality ─────────────────────────────────────────────────

export type ServiceStatus = 'healthy' | 'degraded' | 'down'
export type ServiceKind = 'database' | 'self' | 'http' | 'auth'
export type RestartTarget = 'api' | 'web'
export type RestartMethod = 'railway' | 'tsx-watch' | 'next-watch' | 'unsupported'
export type ServiceAction = 'reconnect' | 'recheck' | 'restart' | 'gc'

export interface ServiceCheck {
  name: string
  kind: ServiceKind
  status: ServiceStatus
  latencyMs: number | null
  message: string
  checkedAt: string
  url?: string
  actions?: ServiceAction[]
  details?: Record<string, string | number | boolean>
}

export interface HealthReport {
  overall: ServiceStatus
  services: ServiceCheck[]
  serverUptimeSeconds: number
  memoryMB: { used: number; total: number; limit?: number; percent: number; rssMB: number; externalMB: number; arrayBuffersMB: number }
  cpu: { user: number; system: number; loadAvg1: number; loadAvg5: number; loadAvg15: number; coreCount: number }
  eventLoop: { lagMeanMs: number; lagP99Ms: number; lagMaxMs: number }
  process: {
    nodeVersion: string
    pid: number
    env: string
    platform: string
    arch: string
    apiVersion: string
    startedAt: string
    activeHandles: number
    activeRequests: number
  }
  capabilities: {
    canRestartApi: RestartMethod
    canRestartWeb: RestartMethod
    canForceGc: boolean
    canReconnectDb: boolean
  }
  checkedAt: string
}

export const healthApi = {
  ping: (): Promise<{ status: string; ts: string }> =>
    apiFetch('/health'),
  services: (token: string): Promise<HealthReport> =>
    apiFetch('/health/services', { token }),
  reconnectDb: (token: string): Promise<{ triggered: boolean; result: ServiceCheck }> =>
    apiFetch('/health/services/reconnect-db', { method: 'POST', body: '{}', token }),
  recheck: (token: string, name: string): Promise<ServiceCheck> =>
    apiFetch(`/health/services/${encodeURIComponent(name)}/recheck`, { method: 'POST', body: '{}', token }),
  gc: (token: string): Promise<{ ran: boolean; before: number; after: number }> =>
    apiFetch('/health/services/gc', { method: 'POST', body: '{}', token }),
  restart: (token: string, target: RestartTarget): Promise<{ ok: boolean; method: RestartMethod; message: string }> =>
    apiFetch('/health/services/restart', { method: 'POST', body: JSON.stringify({ target }), token }),
  diagnostics: (token: string): Promise<DiagnosticsReport> =>
    apiFetch('/health/diagnostics', { method: 'POST', body: '{}', token }),
}

export type FindingSeverity = 'critical' | 'warning' | 'info'

export type DiagnosticFinding = {
  id: string
  service: string
  severity: FindingSeverity
  title: string
  message: string
  suggestion: string
  command?: string
  docsHint?: string
  remediable?: boolean
}

export type DiagnosticsReport = {
  ranAt: string
  durationMs: number
  overall: ServiceStatus
  summary: {
    total: number
    critical: number
    warning: number
    info: number
    healthyServices: number
    totalServices: number
  }
  findings: DiagnosticFinding[]
}

// ─── Users / RBAC ─────────────────────────────────────────────────────────────

export type UserRole = 'OWNER' | 'MANAGER' | 'CONTENT_EDITOR' | 'ORDER_MANAGER' | 'VIEWER' | 'STAFF' | 'CASHIER'

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

// ─── POS ──────────────────────────────────────────────────────────────────────

export type PosRegister = {
  id: string
  name: string
  location: string | null
  isActive: boolean
  createdAt: string
}

export type PosShift = {
  id: string
  registerId: string
  cashierId: string
  status: 'OPEN' | 'CLOSED'
  openingFloat: string
  closingCash: string | null
  expectedCash: string | null
  cashVariance: string | null
  notes: string | null
  openedAt: string
  closedAt: string | null
  register?: PosRegister
}

export type PosHoldCart = {
  items: Array<{ productId: string; productName: string; unitPrice: string; quantity: number }>
  discountAmount?: string
  discountReason?: string
  notes?: string
}

export type PosHold = {
  id: string
  shiftId: string
  cashierId: string
  customerId: string | null
  label: string | null
  cart: PosHoldCart
  status: 'HELD' | 'RESUMED' | 'VOIDED'
  createdAt: string
  customer?: Customer | null
}

export type PosCheckoutInput = {
  shiftId: string
  registerId: string
  items: Array<{ productId: string; productName: string; unitPrice: string; quantity: number }>
  customerId?: string | null
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CARD'
  tenderedAmount?: number
  momoReference?: string
  cardLast4?: string
  discountAmount?: number
  discountReason?: string
  taxAmount?: number
  notes?: string
}

export type PosShiftSummary = {
  shift: PosShift
  totals: { orders: number; gross: string; discounts: string }
  byMethod: Array<{ method: string; count: number; total: string }>
}

export const posApi = {
  listRegisters: (token: string): Promise<PosRegister[]> =>
    apiFetch('/pos/registers', { token }),
  createRegister: (data: { name: string; location?: string }, token: string): Promise<PosRegister> =>
    apiFetch('/pos/registers', { method: 'POST', body: JSON.stringify(data), token }),

  currentShift: (token: string): Promise<PosShift | null> =>
    apiFetch<PosShift | null>('/pos/shifts/current', { token }).catch(() => null),
  openShift: (data: { registerId: string; openingFloat?: number }, token: string): Promise<PosShift> =>
    apiFetch('/pos/shifts/open', { method: 'POST', body: JSON.stringify(data), token }),
  closeShift: (id: string, data: { closingCash?: number; notes?: string }, token: string): Promise<PosShift> =>
    apiFetch(`/pos/shifts/${id}/close`, { method: 'POST', body: JSON.stringify(data), token }),
  shiftSummary: (id: string, token: string): Promise<PosShiftSummary> =>
    apiFetch(`/pos/shifts/${id}/summary`, { token }),
  shiftOrders: (id: string, token: string, limit = 20): Promise<Order[]> =>
    apiFetch(`/pos/shifts/${id}/orders?limit=${limit}`, { token }),

  listHolds: (shiftId: string, token: string): Promise<PosHold[]> =>
    apiFetch(`/pos/holds?shiftId=${shiftId}`, { token }),
  hold: (
    data: { shiftId: string; label?: string; customerId?: string | null; cart: PosHoldCart },
    token: string,
  ): Promise<PosHold> => apiFetch('/pos/holds', { method: 'POST', body: JSON.stringify(data), token }),
  resumeHold: (id: string, token: string): Promise<PosHold> =>
    apiFetch(`/pos/holds/${id}/resume`, { method: 'POST', body: '{}', token }),
  voidHold: (id: string, token: string): Promise<{ ok: true }> =>
    apiFetch(`/pos/holds/${id}/void`, { method: 'POST', body: '{}', token }),

  checkout: (data: PosCheckoutInput, token: string): Promise<Order> =>
    apiFetch('/pos/checkout', { method: 'POST', body: JSON.stringify(data), token }),
}
