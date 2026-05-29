import { Injectable, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { orders, orderItems, customers, products, productVariants } from '@trendmarga/db'
import { eq, desc, sql } from 'drizzle-orm'
import { NotificationsService } from '../notifications/notifications.service'
import { DeliveryEventsService } from '../delivery/events.service'
import { features } from '@trendmarga/config'

const STATUS_TO_TEMPLATE = {
  CONFIRMED: 'orderConfirmed',
  OUT_FOR_DELIVERY: 'orderShipped',
  DELIVERED: 'orderDelivered',
  CANCELLED: 'orderCancelled',
} as const

const STATUS_TO_EVENT = {
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const

function generateDeliveryCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
    private readonly events: DeliveryEventsService,
  ) {}

  findAll() {
    return this.db.client.query.orders.findMany({
      with: { customer: true, items: true },
      orderBy: [desc(orders.createdAt)],
    })
  }

  async findOne(id: string) {
    const order = await this.db.client.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { customer: true, items: true },
    })
    if (!order) throw new NotFoundException(`Order ${id} not found`)
    return order
  }

  async updateStatus(
    id: string,
    status: typeof orders.$inferInsert['status'],
    actor?: { id?: string; name?: string },
  ) {
    const [order] = await this.db.client
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()

    // Append to the delivery_events spine
    const eventType = STATUS_TO_EVENT[status as keyof typeof STATUS_TO_EVENT]
    if (eventType) {
      await this.events.record({
        orderId: id,
        type: eventType,
        actorId: actor?.id,
        actorName: actor?.name,
      }).catch(() => {})
    }

    // Notify customer on lifecycle transitions (no-ops unless FEATURE_NOTIFICATIONS=true)
    const template = STATUS_TO_TEMPLATE[status as keyof typeof STATUS_TO_TEMPLATE]
    if (template && order.customerId) {
      const cust = await this.db.client.query.customers.findFirst({
        where: eq(customers.id, order.customerId),
      })
      if (cust) {
        await this.notifications.dispatch({
          template,
          orderId: order.id,
          customerId: cust.id,
          phone: cust.phone,
          email: cust.email ?? undefined,
          data: {
            orderId: order.id,
            customerName: cust.name,
            total: order.total,
            status,
          },
        })
      }
    }

    return order
  }

  async create(data: { order: typeof orders.$inferInsert; items: Omit<typeof orderItems.$inferInsert, 'orderId'>[] }) {
    // Generate the customer-facing delivery OTP if not already set.
    const orderInput: typeof orders.$inferInsert = {
      ...data.order,
      deliveryCode: data.order.deliveryCode ?? generateDeliveryCode(),
    }

    const result = await this.db.client.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values(orderInput).returning()
      const insertedItems = await tx.insert(orderItems).values(
        data.items.map(item => ({ ...item, orderId: order.id }))
      ).returning()

      // Decrement product / variant inventory (no-op unless FEATURE_INVENTORY=true)
      if (features.inventory) {
        for (const item of data.items) {
          if (item.variantId) {
            await tx.update(productVariants)
              .set({ inventory: sql`GREATEST(${productVariants.inventory} - ${item.quantity}, 0)` })
              .where(eq(productVariants.id, item.variantId))
          } else {
            await tx.update(products)
              .set({ inventory: sql`GREATEST(${products.inventory} - ${item.quantity}, 0)` })
              .where(eq(products.id, item.productId))
          }
        }
      }

      return { ...order, items: insertedItems }
    })

    // Seed the event spine
    await this.events.record({ orderId: result.id, type: 'CREATED' }).catch(() => {})
    if (result.status === 'CONFIRMED') {
      await this.events.record({ orderId: result.id, type: 'CONFIRMED' }).catch(() => {})
    }

    // Fire order-placed notification (no-op unless flag enabled)
    if (result.customerId) {
      const cust = await this.db.client.query.customers.findFirst({
        where: eq(customers.id, result.customerId),
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
}
