const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

async function apiFetch<T = unknown>(
  path: string,
  opts?: RequestInit & { token?: string | null; timeoutMs?: number },
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts?.token) headers['Authorization'] = `Bearer ${opts.token}`

  const { token: _token, timeoutMs, ...rest } = opts ?? {}
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers,
    signal: rest.signal ?? AbortSignal.timeout(timeoutMs ?? 8000),
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
  /** Legacy URL list (still populated for back-compat). Use imageAssets for new code. */
  images: string[]
  /** Structured image data, ordered by sortOrder. Empty array if none. */
  imageAssets?: ProductImage[]
  /** Purchasable SKU variants. Empty array means this product is sold as a single SKU. */
  variants?: ProductVariant[]
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

// ─── Product variants ────────────────────────────────────────────────────────

export type ProductVariant = {
  id: string
  productId: string
  size: string | null
  color: string | null
  colorHex: string | null
  attributes: Record<string, string>
  sku: string | null
  priceOverride: string | null
  inventory: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProductVariantInput = {
  id?: string
  size?: string | null
  color?: string | null
  colorHex?: string | null
  attributes?: Record<string, string>
  sku?: string | null
  priceOverride?: string | null
  inventory?: number
  sortOrder?: number
  isActive?: boolean
}

export const variantsApi = {
  list: (productId: string): Promise<ProductVariant[]> =>
    apiFetch(`/products/${productId}/variants`),
  replaceAll: (productId: string, variants: ProductVariantInput[], token: string): Promise<ProductVariant[]> =>
    apiFetch(`/products/${productId}/variants`, {
      method: 'PUT',
      body: JSON.stringify({ variants }),
      token,
      timeoutMs: 30000,
    }),
  create: (productId: string, data: ProductVariantInput, token: string): Promise<ProductVariant> =>
    apiFetch(`/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(data), token }),
  update: (productId: string, variantId: string, data: ProductVariantInput, token: string): Promise<ProductVariant> =>
    apiFetch(`/products/${productId}/variants/${variantId}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: (productId: string, variantId: string, token: string) =>
    apiFetch(`/products/${productId}/variants/${variantId}`, { method: 'DELETE', token }),
}

// ─── Product images ───────────────────────────────────────────────────────────

export type ImageVariantName = 'thumb' | 'grid' | 'detail' | 'zoom' | 'original'

export type ProductImage = {
  id: string
  productId: string
  source: 'upload' | 'external'
  alt: string | null
  width: number | null
  height: number | null
  sortOrder: number
  isPrimary: boolean
  blurDataUrl: string | null
  url: string | null
  urls: Record<ImageVariantName, string | null>
}

export type PresignResponse = {
  uploadUrl: string
  key: string
  headers: Record<string, string>
  driver: 'r2' | 'local'
  maxBytes: number
}

export const imagesApi = {
  list: (productId: string): Promise<ProductImage[]> =>
    apiFetch(`/images?productId=${encodeURIComponent(productId)}`),
  presign: (
    body: { productId: string; contentType: string; size: number },
    token: string,
  ): Promise<PresignResponse> =>
    apiFetch('/images/presign', { method: 'POST', body: JSON.stringify(body), token }),
  finalize: (
    body: { productId: string; tempKey: string; alt?: string; isPrimary?: boolean },
    token: string,
  ): Promise<ProductImage> =>
    apiFetch('/images/finalize', {
      method: 'POST',
      body: JSON.stringify(body),
      token,
      timeoutMs: 60000,
    }),
  addExternal: (
    body: { productId: string; url: string; alt?: string },
    token: string,
  ): Promise<ProductImage> =>
    apiFetch('/images/external', { method: 'POST', body: JSON.stringify(body), token }),
  patch: (
    id: string,
    body: { alt?: string; sortOrder?: number; isPrimary?: boolean },
    token: string,
  ): Promise<ProductImage> =>
    apiFetch(`/images/${id}`, { method: 'PATCH', body: JSON.stringify(body), token }),
  reorder: (
    body: { productId: string; ids: string[] },
    token: string,
  ): Promise<ProductImage[]> =>
    apiFetch('/images/reorder', { method: 'POST', body: JSON.stringify(body), token }),
  delete: (id: string, token: string) =>
    apiFetch(`/images/${id}`, { method: 'DELETE', token }),
}

/**
 * Direct binary upload to the presigned URL.
 * Uses XHR so we get upload progress events.
 */
export function uploadToPresignedUrl(
  presigned: PresignResponse,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', presigned.uploadUrl, true)
    for (const [k, v] of Object.entries(presigned.headers)) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed: HTTP ${xhr.status} ${xhr.responseText.slice(0, 200)}`))
    }
    xhr.send(file)
  })
}

/**
 * Resolve the best image URL for a product at a given variant.
 *
 * Strategy:
 *   1. If the product has structured `imageAssets`, pick the primary (or
 *      first by sortOrder) and return the requested variant URL.
 *   2. Otherwise fall back to the legacy `images[0]` URL.
 *   3. Returns null if the product has no images.
 *
 * Also returns the blur placeholder + dimensions (when known) so callers can
 * pass them to next/image.
 */
export function resolveProductImage(
  product: Pick<Product, 'images' | 'imageAssets' | 'name'>,
  variant: ImageVariantName = 'grid',
): { url: string; alt: string; blurDataUrl?: string; width?: number; height?: number } | null {
  const assets = product.imageAssets ?? []
  if (assets.length > 0) {
    const primary = assets.find((a) => a.isPrimary) ?? assets[0]
    const url = primary.urls[variant] ?? primary.urls.detail ?? primary.url
    if (url) {
      return {
        url,
        alt: primary.alt ?? product.name,
        blurDataUrl: primary.blurDataUrl ?? undefined,
        width: primary.width ?? undefined,
        height: primary.height ?? undefined,
      }
    }
  }
  const legacy = product.images?.[0]
  if (legacy) return { url: legacy, alt: product.name }
  return null
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export type OrderItem = {
  id: string
  orderId: string
  productId: string
  productName: string
  unitPrice: string
  quantity: number
  variantId?: string | null
  variantLabel?: string | null
}

export type Order = {
  id: string
  customerId: string | null
  status: OrderStatus
  source?: 'ONLINE' | 'POS'
  subtotal: string
  deliveryFee: string
  discountAmount?: string
  discountReason?: string | null
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
  paymentStatus?: PaymentStatus
  paidAt?: string | null
  zoneId?: string | null
  deliveryCode?: string | null
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

// ─── Delivery v1: couriers, assignments, events, payouts, payment verifications ───

export type CourierType = 'FLEET' | 'FREELANCE'
export type AssignmentStatus = 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED'
export type PayoutMethod = 'MOMO' | 'CASH' | 'BANK'
export type PaymentProvider = 'MTN_MOMO' | 'VODAFONE_CASH' | 'AIRTELTIGO' | 'BANK' | 'OTHER'
export type PaymentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export type DeliveryEventType =
  | 'CREATED' | 'CONFIRMED' | 'PROCESSING' | 'READY_FOR_PICKUP'
  | 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'FAILED' | 'CANCELLED' | 'PAYMENT_VERIFIED' | 'PAYMENT_REJECTED' | 'NOTE'

export type Courier = {
  id: string
  name: string
  phone: string
  employmentType: CourierType
  commissionPct: string
  flatPerDelivery: string | null
  vehicle: string | null
  momoNumber: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CourierWithStats = Courier & {
  deliveries30d: number
  delivered30d: number
  onTimePct: number | null
}

export type CourierInput = {
  name: string
  phone: string
  employmentType: CourierType
  commissionPct?: string
  flatPerDelivery?: string | null
  vehicle?: string | null
  momoNumber?: string | null
  isActive?: boolean
  notes?: string | null
}

export type DeliveryAssignment = {
  id: string
  orderId: string
  courierId: string
  status: AssignmentStatus
  deliveryFee: string
  commissionAmount: string
  assignedAt: string
  pickedUpAt: string | null
  deliveredAt: string | null
  failedAt: string | null
  failureReason: string | null
  payoutId: string | null
  courier?: Courier | null
}

export type DeliveryEvent = {
  id: string
  orderId: string
  type: DeliveryEventType
  actorId: string | null
  actorName: string | null
  courierId: string | null
  note: string | null
  createdAt: string
}

export type PayoutSummary = {
  from: string
  to: string
  couriers: Array<{
    courier: Courier
    deliveries: number
    revenue: string
    owed: string
  }>
}

export type Payout = {
  id: string
  courierId: string
  amount: string
  method: PayoutMethod
  reference: string | null
  periodFrom: string
  periodTo: string
  deliveryCount: number
  paidBy: string | null
  paidAt: string
  notes: string | null
  createdAt: string
  courier?: Courier | null
}

export type PaymentVerification = {
  id: string
  orderId: string
  amount: string
  provider: PaymentProvider
  providerRef: string | null
  fromPhone: string | null
  screenshotUrl: string | null
  status: PaymentVerificationStatus
  verifiedBy: string | null
  verifiedAt: string | null
  rejectionReason: string | null
  createdAt: string
  order?: Order | null
}

export const couriersApi = {
  list: (token: string): Promise<Courier[]> => apiFetch('/couriers', { token }),
  listWithStats: (token: string): Promise<CourierWithStats[]> => apiFetch('/couriers/stats', { token }),
  create: (data: CourierInput, token: string): Promise<Courier> =>
    apiFetch('/couriers', { method: 'POST', body: JSON.stringify(data), token }),
  update: (id: string, data: Partial<CourierInput>, token: string): Promise<Courier> =>
    apiFetch(`/couriers/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  deactivate: (id: string, token: string): Promise<Courier> =>
    apiFetch(`/couriers/${id}/deactivate`, { method: 'PATCH', token }),
}

export const assignmentsApi = {
  assign: (orderId: string, courierId: string, token: string): Promise<DeliveryAssignment> =>
    apiFetch('/delivery/assignments', { method: 'POST', body: JSON.stringify({ orderId, courierId }), token }),
  transition: (orderId: string, next: 'PICKED_UP' | 'DELIVERED' | 'FAILED', token: string, reason?: string) =>
    apiFetch<DeliveryAssignment>(`/delivery/assignments/${orderId}/transition`, {
      method: 'PATCH',
      body: JSON.stringify({ next, reason }),
      token,
    }),
  forOrder: (orderId: string, token: string): Promise<DeliveryAssignment[]> =>
    apiFetch(`/delivery/assignments/order/${orderId}`, { token }),
}

export const deliveryEventsApi = {
  forOrder: (orderId: string, token: string): Promise<DeliveryEvent[]> =>
    apiFetch(`/delivery/events/${orderId}`, { token }),
}

export const payoutsApi = {
  summary: (token: string): Promise<PayoutSummary> => apiFetch('/payouts/summary', { token }),
  recent: (token: string): Promise<Payout[]> => apiFetch('/payouts/recent', { token }),
  pay: (
    courierId: string,
    body: { method?: PayoutMethod; reference?: string; notes?: string },
    token: string,
  ): Promise<Payout> =>
    apiFetch(`/payouts/pay/${courierId}`, { method: 'POST', body: JSON.stringify(body), token }),
}

export const paymentVerificationsApi = {
  list: (token: string): Promise<PaymentVerification[]> => apiFetch('/payment-verifications', { token }),
  stats: (token: string): Promise<{
    pending: { count: number; amount: string }
    verifiedToday: { count: number; amount: string }
  }> => apiFetch('/payment-verifications/stats', { token }),
  confirm: (id: string, token: string): Promise<{ id: string; status: 'VERIFIED' }> =>
    apiFetch(`/payment-verifications/${id}/confirm`, { method: 'POST', token }),
  reject: (id: string, reason: string, token: string): Promise<{ id: string; status: 'REJECTED' }> =>
    apiFetch(`/payment-verifications/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }), token }),
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
  requiresPrepayment?: boolean
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

export type DashboardPeriod = '24h' | '7d' | '30d' | '90d' | 'all'

export type DashboardStats = {
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  period?: DashboardPeriod
  revenue30d: string
  revenuePeriod?: string
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
  dashboard: (token: string, period?: DashboardPeriod): Promise<DashboardStats> =>
    apiFetch(`/analytics/dashboard${period ? `?period=${encodeURIComponent(period)}` : ''}`, { token }),
}

// ─── Health / Service Quality ─────────────────────────────────────────────────

export type ServiceStatus = 'healthy' | 'degraded' | 'down'
export type ServiceKind = 'database' | 'self' | 'http' | 'auth' | 'payment'
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
  restartAll: (token: string): Promise<{
    api: { ok: boolean; method: RestartMethod; message: string }
    web: { ok: boolean; method: RestartMethod; message: string }
  }> =>
    apiFetch('/health/services/restart-all', { method: 'POST', body: '{}', token }),
  supervisor: (token: string): Promise<{
    present: boolean
    pid?: number
    status?: string
    restarts?: number
    lastStartUnix?: number
    lastEventUnix?: number
    lastExitCode?: number
    error?: string
  }> =>
    apiFetch('/health/services/supervisor', { token }),
  warmCache: (token: string): Promise<{
    ok: boolean
    totalMs: number
    routes: Array<{ path: string; status: number | null; latencyMs: number | null; error?: string }>
  }> =>
    apiFetch('/health/services/warm-cache', { method: 'POST', body: '{}', token }),
  reseedZones: (token: string): Promise<{
    ok: boolean
    zones: Array<{ id: string; name: string; action: 'inserted' | 'updated' }>
  }> =>
    apiFetch('/health/services/reseed-zones', { method: 'POST', body: '{}', token }),
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

// ─── Discount codes (FEATURE_DISCOUNTS) ──────────────────────────────────────

export type DiscountType = 'PERCENT' | 'FIXED'

export type DiscountCode = {
  id: string
  code: string
  type: DiscountType
  value: string
  minSubtotal: string
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  isPromoted: boolean
  promoLabel: string | null
  createdAt: string
}

export type DiscountCodeInput = {
  id?: string
  code: string
  type: DiscountType
  value: number
  minSubtotal?: number
  maxUses?: number | null
  expiresAt?: string | null
  isActive?: boolean
  isPromoted?: boolean
  promoLabel?: string | null
}

export const discountsApi = {
  list: (token: string): Promise<DiscountCode[]> =>
    apiFetch('/discounts', { token }),
  listPromoted: (): Promise<DiscountCode[]> =>
    apiFetch('/discounts/promoted'),
  upsert: (data: DiscountCodeInput, token: string): Promise<DiscountCode> =>
    apiFetch('/discounts', { method: 'POST', body: JSON.stringify(data), token }),
  delete: (id: string, token: string): Promise<void> =>
    apiFetch(`/discounts/${id}`, { method: 'DELETE', token }),
  validate: (code: string, subtotal: number): Promise<{ code: DiscountCode; discount: number }> =>
    apiFetch('/discounts/validate', { method: 'POST', body: JSON.stringify({ code, subtotal }) }),
}

// ─── Storefront (public v1 endpoints) ─────────────────────────────────────────

export type PlaceOrderInput = {
  customer: {
    name: string
    phone: string
    email?: string
    address: { street: string; city: string; region: string; country: string; zip?: string }
  }
  items: Array<{
    productId: string
    productName: string
    unitPrice: number
    quantity: number
    variantId?: string
    variantLabel?: string
  }>
  zoneId: string
  notes?: string
  paymentMethod?: 'CASH_ON_DELIVERY' | 'MOBILE_MONEY' | 'CARD'
  subtotal: number
  deliveryFee: number
  discountCode?: string
  discountAmount?: number
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
  getOrder: (
    id: string,
  ): Promise<
    Order & {
      customer?: Customer
      items?: OrderItem[]
      activeCourier?: {
        name: string
        phone: string
        vehicle: string | null
        assignmentStatus: AssignmentStatus
        pickedUpAt: string | null
      } | null
      events?: DeliveryEvent[]
    }
  > => apiFetch(`/v1/orders/${id}`),
}

export type SearchSuggestion = {
  query: string
  products: Array<{
    id: string
    name: string
    slug: string
    price: string
    image: string | null
    categoryName: string | null
  }>
  categories: Array<{ id: string; name: string; slug: string; imageUrl: string | null }>
}

export const searchApi = {
  suggest: (q: string, limit = 6): Promise<SearchSuggestion> => {
    const params = new URLSearchParams({ q, limit: String(limit) })
    return apiFetch(`/v1/search?${params}`, { timeoutMs: 4000 })
  },
}

// ─── Web Push ────────────────────────────────────────────────────────────────

export type VapidKeyInfo = { publicKey: string | null; configured: boolean }

export const pushApi = {
  getVapidKey: (): Promise<VapidKeyInfo> => apiFetch('/v1/push/vapid-key', { timeoutMs: 4000 }),
  subscribe: (sub: PushSubscriptionJSON & { userAgent?: string }): Promise<{ id: string; status: 'created' | 'updated' }> =>
    apiFetch('/v1/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
  unsubscribe: (endpoint: string): Promise<{ ok: boolean }> =>
    apiFetch('/v1/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),
  testBroadcast: (
    payload: { title: string; body: string; url?: string; tag?: string },
    token: string,
  ): Promise<{ sent: number; failed: number; pruned: number }> =>
    apiFetch('/cms/push/test', { method: 'POST', body: JSON.stringify(payload), token }),
}

export type PaymentIntentInit = {
  reference: string
  authorizationUrl: string | null
  accessCode: string | null
  status: 'REQUIRES_AUTH' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'ABANDONED'
}

export type PaymentLookup =
  | { found: false }
  | {
      found: true
      reference: string
      status: 'REQUIRES_AUTH' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'ABANDONED'
      orderId: string
      amount: string
      currency: string
      channel: string
    }

export const paymentsApi = {
  init: (orderId: string, channel?: 'CARD' | 'MOBILE_MONEY' | 'BANK'): Promise<PaymentIntentInit> =>
    apiFetch('/v1/payments/init', {
      method: 'POST',
      body: JSON.stringify({ orderId, channel }),
    }),
  lookup: (reference: string): Promise<PaymentLookup> =>
    apiFetch(`/v1/payments/${encodeURIComponent(reference)}`),
}

// ─── Payments admin (CMS) ─────────────────────────────────────────────────────

export type PaymentIntentStatus =
  | 'REQUIRES_AUTH'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'ABANDONED'

export type PaymentIntentRow = {
  id: string
  orderId: string
  providerReference: string
  status: PaymentIntentStatus
  amount: string
  refundedAmount?: string
  disputeStatus?: string | null
  disputeUpdatedAt?: string | null
  currency: string
  channel: string | null
  customerEmail: string | null
  authorizationUrl: string | null
  failureReason: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentEventRow = {
  id: string
  intentId: string | null
  orderId: string | null
  reference: string | null
  eventType: string
  status: string | null
  amount: string | null
  currency: string | null
  signatureValid: boolean | null
  source: string | null
  processed: boolean
  processingError: string | null
  receivedAt: string
}

export type PaymentStats = {
  last24h: { succeeded: number; failed: number; open: number; revenue: string }
  stuckIntents: number
  eventsWithErrors24h: number
  oldestPendingSeconds: number
  openDisputes?: number
  circuitBreaker: { state: string; failures: number; openedAt: string | null }
  mode: 'live' | 'test' | 'disabled'
}

export type PaymentConfig = {
  mode: 'live' | 'test' | 'disabled'
  publicKey: string | null
  enabled: boolean
  callbackUrl: string | null
  webhookUrl: string
  circuitBreaker: { state: string; failures: number; openedAt: string | null }
}

export const paymentsAdminApi = {
  stats: (token: string): Promise<PaymentStats> => apiFetch('/cms/payments/stats', { token }),
  config: (token: string): Promise<PaymentConfig> => apiFetch('/cms/payments/config', { token }),
  intents: (token: string, status?: PaymentIntentStatus, limit = 50): Promise<PaymentIntentRow[]> => {
    const qs = new URLSearchParams()
    if (status) qs.set('status', status)
    qs.set('limit', String(limit))
    return apiFetch(`/cms/payments/intents?${qs.toString()}`, { token })
  },
  events: (
    token: string,
    opts: { reference?: string; intentId?: string; limit?: number } = {},
  ): Promise<PaymentEventRow[]> => {
    const qs = new URLSearchParams()
    if (opts.reference) qs.set('reference', opts.reference)
    if (opts.intentId) qs.set('intentId', opts.intentId)
    qs.set('limit', String(opts.limit ?? 100))
    return apiFetch(`/cms/payments/events?${qs.toString()}`, { token })
  },
  replay: (token: string, eventId: string): Promise<{ ok: boolean; error?: string }> =>
    apiFetch(`/cms/payments/events/${encodeURIComponent(eventId)}/replay`, {
      method: 'POST',
      token,
    }),
  reconcile: (token: string): Promise<{ reconciled: number }> =>
    apiFetch('/cms/payments/reconcile', { method: 'POST', token }),
  refund: (
    token: string,
    intentId: string,
    body: { amount?: number; reason?: string } = {},
  ): Promise<{ ok: boolean; refund: Record<string, unknown> }> =>
    apiFetch(`/cms/payments/intents/${encodeURIComponent(intentId)}/refund`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
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

// ─── Reviews ──────────────────────────────────────────────────────────────────

export type ReviewRow = {
  id: string
  productId: string
  customerId: string
  orderId: string | null
  rating: number
  title: string | null
  body: string | null
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN'
  createdAt: string
  customer?: { name: string; email?: string | null }
  product?: { name: string; slug: string }
}

export type ReviewSummary = {
  count: number
  avg: number
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
}

export type ReviewSubmitInput = {
  productId: string
  orderId: string
  email: string
  rating: number
  title?: string
  body?: string
}

export const reviewsApi = {
  listForProduct: (productId: string): Promise<ReviewRow[]> =>
    apiFetch(`/v1/reviews/product/${encodeURIComponent(productId)}`),
  summary: (productId: string): Promise<ReviewSummary> =>
    apiFetch(`/v1/reviews/product/${encodeURIComponent(productId)}/summary`),
  submit: (data: ReviewSubmitInput): Promise<{ id: string; status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' }> =>
    apiFetch('/v1/reviews', { method: 'POST', body: JSON.stringify(data) }),
}

export const reviewsAdminApi = {
  list: (token: string): Promise<ReviewRow[]> => apiFetch('/cms/reviews', { token }),
  setStatus: (id: string, status: 'PENDING' | 'PUBLISHED' | 'HIDDEN', token: string): Promise<ReviewRow> =>
    apiFetch(`/cms/reviews/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      token,
    }),
  remove: (id: string, token: string): Promise<void> =>
    apiFetch(`/cms/reviews/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
}

// ─── Account (Clerk-linked customer) ─────────────────────────────────────────

export type SavedAddress = {
  id: string
  label: string
  street: string
  city: string
  region: string
  country: string
  zip: string | null
  isDefault?: boolean
}

export type AccountCustomer = {
  id: string
  clerkUserId: string | null
  name: string
  email: string | null
  phone: string
  address: { street: string; city: string; region: string; country: string; zip: string | null }
  savedAddresses: SavedAddress[] | null
  createdAt: string
}

export type AccountOrder = {
  id: string
  status: string
  source: string
  subtotal: string
  deliveryFee: string
  discountAmount: string
  total: string
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  items: Array<{ id: string; productName: string; quantity: number; unitPrice: string; variantLabel: string | null }>
}

export const accountApi = {
  me: (token: string): Promise<AccountCustomer | null> =>
    apiFetch('/v1/account/me', { token }),
  bootstrap: (
    data: { name: string; email?: string | null; phone: string },
    token: string,
  ): Promise<AccountCustomer> =>
    apiFetch('/v1/account/bootstrap', { method: 'POST', body: JSON.stringify(data), token }),
  updateProfile: (
    patch: { name?: string; email?: string | null; phone?: string },
    token: string,
  ): Promise<AccountCustomer> =>
    apiFetch('/v1/account/me', { method: 'PATCH', body: JSON.stringify(patch), token }),
  orders: (token: string): Promise<AccountOrder[]> => apiFetch('/v1/account/orders', { token }),
  listAddresses: (token: string): Promise<SavedAddress[]> => apiFetch('/v1/account/addresses', { token }),
  addAddress: (addr: Omit<SavedAddress, 'id'>, token: string): Promise<SavedAddress[]> =>
    apiFetch('/v1/account/addresses', { method: 'POST', body: JSON.stringify(addr), token }),
  updateAddress: (id: string, patch: Partial<Omit<SavedAddress, 'id'>>, token: string): Promise<SavedAddress[]> =>
    apiFetch(`/v1/account/addresses/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch), token }),
  removeAddress: (id: string, token: string): Promise<SavedAddress[]> =>
    apiFetch(`/v1/account/addresses/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
}
