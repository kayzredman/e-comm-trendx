import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { customers } from '@trendmarga/db'
import { eq, desc } from 'drizzle-orm'

@Injectable()
export class CustomersService {
  constructor(private readonly db: DbService) {}

  findAll() {
    return this.db.client.query.customers.findMany({
      with: { orders: true },
      orderBy: [desc(customers.createdAt)],
    })
  }

  findOne(id: string) {
    return this.db.client.query.customers.findFirst({
      where: eq(customers.id, id),
      with: { orders: { with: { items: true } } },
    })
  }

  findByClerkId(clerkUserId: string) {
    return this.db.client.query.customers.findFirst({
      where: eq(customers.clerkUserId, clerkUserId),
    })
  }

  async upsertByPhone(data: typeof customers.$inferInsert) {
    const existing = await this.db.client.query.customers.findFirst({
      where: eq(customers.phone, data.phone),
    })
    if (existing) {
      const [updated] = await this.db.client
        .update(customers)
        .set({ name: data.name, email: data.email, address: data.address })
        .where(eq(customers.id, existing.id))
        .returning()
      return updated
    }
    const [created] = await this.db.client.insert(customers).values(data).returning()
    return created
  }

  async bootstrapForClerkUser(
    clerkUserId: string,
    profile: { name: string; email?: string | null; phone: string; address?: typeof customers.$inferInsert['address'] },
  ) {
    const existing = await this.findByClerkId(clerkUserId)
    if (existing) return existing
    const byPhone = profile.phone
      ? await this.db.client.query.customers.findFirst({ where: eq(customers.phone, profile.phone) })
      : null
    if (byPhone) {
      const [linked] = await this.db.client
        .update(customers)
        .set({ clerkUserId, email: profile.email ?? byPhone.email, name: profile.name || byPhone.name })
        .where(eq(customers.id, byPhone.id))
        .returning()
      return linked
    }
    const [created] = await this.db.client
      .insert(customers)
      .values({
        clerkUserId,
        name: profile.name,
        email: profile.email ?? null,
        phone: profile.phone,
        address: profile.address ?? { street: '', city: '', region: '', country: 'GH', zip: null },
      })
      .returning()
    return created
  }

  async updateProfile(customerId: string, patch: { name?: string; email?: string | null; phone?: string }) {
    const [updated] = await this.db.client
      .update(customers)
      .set(patch)
      .where(eq(customers.id, customerId))
      .returning()
    return updated
  }

  async listAddresses(customerId: string) {
    const c = await this.findOne(customerId)
    return c?.savedAddresses ?? []
  }

  async addAddress(
    customerId: string,
    addr: { label: string; street: string; city: string; region: string; country: string; zip: string | null; isDefault?: boolean },
  ) {
    const c = await this.findOne(customerId)
    if (!c) throw new Error('Customer not found')
    const current = c.savedAddresses ?? []
    const id = `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    const cleared = addr.isDefault ? current.map(a => ({ ...a, isDefault: false })) : current
    const next = cleared.concat([{ id, ...addr }])
    const [updated] = await this.db.client
      .update(customers)
      .set({ savedAddresses: next })
      .where(eq(customers.id, customerId))
      .returning()
    return updated.savedAddresses
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    patch: Partial<{ label: string; street: string; city: string; region: string; country: string; zip: string | null; isDefault: boolean }>,
  ) {
    const c = await this.findOne(customerId)
    if (!c) throw new Error('Customer not found')
    const current = c.savedAddresses ?? []
    const next = current.map(a => {
      if (a.id !== addressId) return patch.isDefault ? { ...a, isDefault: false } : a
      return { ...a, ...patch }
    })
    const [updated] = await this.db.client
      .update(customers)
      .set({ savedAddresses: next })
      .where(eq(customers.id, customerId))
      .returning()
    return updated.savedAddresses
  }

  async removeAddress(customerId: string, addressId: string) {
    const c = await this.findOne(customerId)
    if (!c) throw new Error('Customer not found')
    const current = c.savedAddresses ?? []
    const next = current.filter(a => a.id !== addressId)
    const [updated] = await this.db.client
      .update(customers)
      .set({ savedAddresses: next })
      .where(eq(customers.id, customerId))
      .returning()
    return updated.savedAddresses
  }

  async listMyOrders(customerId: string) {
    return this.db.client.query.orders.findMany({
      where: (o, { eq }) => eq(o.customerId, customerId),
      with: { items: true },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
      limit: 50,
    })
  }
}
