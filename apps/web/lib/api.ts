const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

async function apiFetch<T = unknown>(
  path: string,
  opts?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts?.token) headers['Authorization'] = `Bearer ${opts.token}`

  const { token: _token, ...rest } = opts ?? {}
  const res = await fetch(`${API}${path}`, { ...rest, headers })

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
}

export const categoriesApi = {
  list: (): Promise<Category[]> => apiFetch('/categories'),
  get: (id: string): Promise<Category> => apiFetch(`/categories/${id}`),
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
