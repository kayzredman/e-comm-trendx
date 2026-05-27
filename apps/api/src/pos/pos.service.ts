import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import {
  posRegisters,
  posShifts,
  posHolds,
  orders,
  orderItems,
  customers,
  products,
} from '@trendmarga/db'
import { and, desc, eq, sql } from 'drizzle-orm'
import { features } from '@trendmarga/config'
import { NotificationsService } from '../notifications/notifications.service'

type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'CARD'

export type PosCartItem = {
  productId: string
  productName: string
  unitPrice: string
  quantity: number
}

export type CheckoutPayload = {
  items: PosCartItem[]
  customerId?: string | null
  paymentMethod: PaymentMethod
  tenderedAmount?: number
  momoReference?: string
  cardLast4?: string
  discountAmount?: number
  discountReason?: string
  taxAmount?: number
  notes?: string
}

function genReceiptNumber() {
  // 8-digit numeric receipt, e.g. 24052700001 (yyMMdd + random 4)
  const d = new Date()
  const y = String(d.getFullYear()).slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `R${y}${m}${day}${rand}`
}

@Injectable()
export class PosService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Registers ──────────────────────────────────────────────────────────────
  listRegisters() {
    return this.db.client.query.posRegisters.findMany({
      where: eq(posRegisters.isActive, true),
      orderBy: [desc(posRegisters.createdAt)],
    })
  }

  async createRegister(data: { name: string; location?: string }) {
    const [row] = await this.db.client.insert(posRegisters).values(data).returning()
    return row
  }

  // ── Shifts ────────────────────────────────────────────────────────────────
  async openShift(cashierId: string, body: { registerId: string; openingFloat?: number }) {
    // One open shift per cashier
    const existing = await this.db.client.query.posShifts.findFirst({
      where: and(eq(posShifts.cashierId, cashierId), eq(posShifts.status, 'OPEN')),
    })
    if (existing) {
      throw new BadRequestException('A shift is already open for this cashier')
    }
    const register = await this.db.client.query.posRegisters.findFirst({
      where: eq(posRegisters.id, body.registerId),
    })
    if (!register) throw new NotFoundException('Register not found')

    const [shift] = await this.db.client
      .insert(posShifts)
      .values({
        cashierId,
        registerId: body.registerId,
        openingFloat: String(body.openingFloat ?? 0),
        status: 'OPEN',
      })
      .returning()
    return shift
  }

  async currentShift(cashierId: string) {
    return this.db.client.query.posShifts.findFirst({
      where: and(eq(posShifts.cashierId, cashierId), eq(posShifts.status, 'OPEN')),
      with: { register: true },
    })
  }

  async closeShift(cashierId: string, shiftId: string, body: { closingCash?: number; notes?: string }) {
    const shift = await this.db.client.query.posShifts.findFirst({
      where: eq(posShifts.id, shiftId),
    })
    if (!shift) throw new NotFoundException('Shift not found')
    if (shift.cashierId !== cashierId) {
      throw new ForbiddenException('Cannot close another cashier\u2019s shift')
    }
    if (shift.status !== 'OPEN') {
      throw new BadRequestException('Shift is not open')
    }

    // Expected cash = opening float + sum of CASH sales for this shift
    const cashTotalsRow = await this.db.client
      .select({
        total: sql<string>`COALESCE(SUM(${orders.total}), 0)::text`,
      })
      .from(orders)
      .where(and(eq(orders.shiftId, shiftId), eq(orders.paymentMethod, 'CASH')))
    const cashSales = Number(cashTotalsRow[0]?.total ?? 0)
    const expected = Number(shift.openingFloat) + cashSales
    const closing = Number(body.closingCash ?? 0)

    const [closed] = await this.db.client
      .update(posShifts)
      .set({
        status: 'CLOSED',
        closingCash: String(closing),
        expectedCash: String(expected),
        cashVariance: String(closing - expected),
        notes: body.notes ?? null,
        closedAt: new Date(),
      })
      .where(eq(posShifts.id, shiftId))
      .returning()
    return closed
  }

  async shiftSummary(shiftId: string) {
    const shift = await this.db.client.query.posShifts.findFirst({
      where: eq(posShifts.id, shiftId),
      with: { register: true, cashier: true },
    })
    if (!shift) throw new NotFoundException('Shift not found')

    const byMethod = await this.db.client
      .select({
        method: orders.paymentMethod,
        count: sql<number>`COUNT(*)::int`,
        total: sql<string>`COALESCE(SUM(${orders.total}), 0)::text`,
      })
      .from(orders)
      .where(eq(orders.shiftId, shiftId))
      .groupBy(orders.paymentMethod)

    const totalsRow = await this.db.client
      .select({
        orders: sql<number>`COUNT(*)::int`,
        gross: sql<string>`COALESCE(SUM(${orders.total}), 0)::text`,
        discounts: sql<string>`COALESCE(SUM(${orders.discountAmount}), 0)::text`,
      })
      .from(orders)
      .where(eq(orders.shiftId, shiftId))

    return {
      shift,
      totals: totalsRow[0] ?? { orders: 0, gross: '0', discounts: '0' },
      byMethod,
    }
  }

  // ── Holds ─────────────────────────────────────────────────────────────────
  listHolds(shiftId: string) {
    return this.db.client.query.posHolds.findMany({
      where: and(eq(posHolds.shiftId, shiftId), eq(posHolds.status, 'HELD')),
      with: { customer: true },
      orderBy: [desc(posHolds.createdAt)],
    })
  }

  async hold(cashierId: string, body: {
    shiftId: string
    label?: string
    customerId?: string | null
    cart: {
      items: PosCartItem[]
      discountAmount?: string
      discountReason?: string
      notes?: string
    }
  }) {
    if (!body.cart?.items?.length) throw new BadRequestException('Cannot hold an empty cart')
    const [held] = await this.db.client
      .insert(posHolds)
      .values({
        cashierId,
        shiftId: body.shiftId,
        customerId: body.customerId ?? null,
        label: body.label ?? null,
        cart: body.cart,
        status: 'HELD',
      })
      .returning()
    return held
  }

  async resumeHold(id: string) {
    const hold = await this.db.client.query.posHolds.findFirst({
      where: eq(posHolds.id, id),
    })
    if (!hold) throw new NotFoundException('Hold not found')
    if (hold.status !== 'HELD') throw new BadRequestException('Hold already resolved')
    await this.db.client
      .update(posHolds)
      .set({ status: 'RESUMED', resolvedAt: new Date() })
      .where(eq(posHolds.id, id))
    return hold
  }

  async voidHold(id: string) {
    const hold = await this.db.client.query.posHolds.findFirst({
      where: eq(posHolds.id, id),
    })
    if (!hold) throw new NotFoundException('Hold not found')
    await this.db.client
      .update(posHolds)
      .set({ status: 'VOIDED', resolvedAt: new Date() })
      .where(eq(posHolds.id, id))
    return { ok: true }
  }

  // ── Checkout (creates POS order) ──────────────────────────────────────────
  async checkout(cashierId: string, shiftId: string, registerId: string, payload: CheckoutPayload) {
    if (!payload.items?.length) throw new BadRequestException('Cart is empty')

    const shift = await this.db.client.query.posShifts.findFirst({
      where: eq(posShifts.id, shiftId),
    })
    if (!shift || shift.status !== 'OPEN') {
      throw new BadRequestException('No open shift')
    }
    if (shift.cashierId !== cashierId) {
      throw new ForbiddenException('Shift belongs to another cashier')
    }

    const subtotal = payload.items.reduce(
      (sum, it) => sum + Number(it.unitPrice) * it.quantity,
      0,
    )
    const discount = Number(payload.discountAmount ?? 0)
    const tax = Number(payload.taxAmount ?? 0)
    const total = Math.max(subtotal - discount + tax, 0)

    if (payload.paymentMethod === 'CASH') {
      const tendered = Number(payload.tenderedAmount ?? 0)
      if (tendered < total) {
        throw new BadRequestException('Tendered amount is less than total due')
      }
    }

    const change =
      payload.paymentMethod === 'CASH'
        ? Math.max((payload.tenderedAmount ?? 0) - total, 0)
        : 0

    const receiptNumber = genReceiptNumber()

    const result = await this.db.client.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          customerId: payload.customerId ?? null,
          status: 'DELIVERED', // POS = completed at point of sale
          source: 'POS',
          subtotal: subtotal.toFixed(2),
          deliveryFee: '0',
          discountAmount: discount.toFixed(2),
          discountReason: payload.discountReason ?? null,
          taxAmount: tax.toFixed(2),
          total: total.toFixed(2),
          notes: payload.notes ?? null,
          paymentMethod: payload.paymentMethod,
          cashierId,
          shiftId,
          registerId,
          tenderedAmount:
            payload.paymentMethod === 'CASH'
              ? (payload.tenderedAmount ?? 0).toFixed(2)
              : null,
          changeAmount: payload.paymentMethod === 'CASH' ? change.toFixed(2) : null,
          momoReference: payload.momoReference ?? null,
          cardLast4: payload.cardLast4 ?? null,
          receiptNumber,
        })
        .returning()

      const items = await tx
        .insert(orderItems)
        .values(
          payload.items.map((it) => ({
            orderId: order.id,
            productId: it.productId,
            productName: it.productName,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
          })),
        )
        .returning()

      if (features.inventory) {
        for (const it of payload.items) {
          await tx
            .update(products)
            .set({
              inventory: sql`GREATEST(${products.inventory} - ${it.quantity}, 0)`,
            })
            .where(eq(products.id, it.productId))
        }
      }

      return { ...order, items }
    })

    // Fire receipt notification if customer attached
    if (payload.customerId) {
      const cust = await this.db.client.query.customers.findFirst({
        where: eq(customers.id, payload.customerId),
      })
      if (cust) {
        await this.notifications.dispatch({
          template: 'orderPlaced',
          orderId: result.id,
          customerId: cust.id,
          phone: cust.phone,
          email: cust.email ?? undefined,
          data: {
            orderId: result.id,
            customerName: cust.name,
            total: result.total,
          },
        })
      }
    }

    return result
  }

  async listRecentOrders(shiftId: string, limit = 20) {
    return this.db.client.query.orders.findMany({
      where: eq(orders.shiftId, shiftId),
      with: { customer: true, items: true },
      orderBy: [desc(orders.createdAt)],
      limit,
    })
  }
}
