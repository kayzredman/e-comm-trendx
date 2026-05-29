import { BadRequestException, Injectable } from '@nestjs/common'
import { ProductsService } from '../products/products.service'
import { CategoriesService } from '../categories/categories.service'
import { CustomersService } from '../customers/customers.service'
import { OrdersService } from '../orders/orders.service'
import { DeliveryService } from '../delivery/delivery.service'
import { DeliveryEventsService } from '../delivery/events.service'
import { AssignmentsService } from '../delivery/assignments.service'
import { CmsService } from '../cms/cms.service'
import { DiscountsService } from '../discounts/discounts.service'
import { DbService } from '../db/db.service'
import { deliveryZones } from '@trendmarga/db'
import { eq } from 'drizzle-orm'

@Injectable()
export class StorefrontService {
  constructor(
    private readonly products: ProductsService,
    private readonly customers: CustomersService,
    private readonly orders: OrdersService,
    private readonly delivery: DeliveryService,
    private readonly cms: CmsService,
    private readonly discounts: DiscountsService,
    private readonly db: DbService,
    private readonly events: DeliveryEventsService,
    private readonly assignments: AssignmentsService,
  ) {}

  getHomepage() {
    return this.cms.getPageSections('HOME')
  }

  getProducts(opts?: { categoryId?: string; search?: string }) {
    return this.products.findAll({ status: 'ACTIVE', ...opts })
  }

  getProductBySlug(slug: string) {
    return this.products.findBySlug(slug)
  }

  getDeliveryZones() {
    return this.delivery.getZones()
  }

  async placeOrder(body: {
    customer: { name: string; phone: string; email?: string; address: any }
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
  }) {
    // Enforce prepay gate: zones flagged requires_prepayment can't accept COD.
    const [zone] = await this.db.client.select().from(deliveryZones).where(eq(deliveryZones.id, body.zoneId))
    const method = body.paymentMethod ?? 'CASH_ON_DELIVERY'
    if (zone?.requiresPrepayment && method === 'CASH_ON_DELIVERY') {
      throw new BadRequestException(
        `Delivery to ${zone.name} requires payment before dispatch. Please choose mobile money.`,
      )
    }

    // Server-side re-validate any submitted discount code via atomic redeem.
    // Client value is treated as untrusted.
    let discountAmount = 0
    let discountReason: string | undefined
    let redeemedId: string | undefined
    if (body.discountCode && body.discountCode.trim()) {
      const { code, discount } = await this.discounts.redeem(body.discountCode, body.subtotal)
      discountAmount = discount
      discountReason = code.code
      redeemedId = code.id
    }

    const total = Math.max(0, body.subtotal - discountAmount) + body.deliveryFee

    try {
      const customer = await this.customers.upsertByPhone(body.customer as any)
      return await this.orders.create({
        order: {
          customerId: customer.id,
          subtotal: String(body.subtotal),
          deliveryFee: String(body.deliveryFee),
          discountAmount: String(discountAmount),
          discountReason,
          total: String(total),
          notes: body.notes,
          paymentMethod: method,
          zoneId: body.zoneId,
        },
        items: body.items.map(i => ({
          productId: i.productId,
          productName: i.productName,
          unitPrice: String(i.unitPrice),
          quantity: i.quantity,
          variantId: i.variantId,
          variantLabel: i.variantLabel,
        })),
      })
    } catch (err) {
      // Compensate: order failed after we already incremented usedCount.
      if (redeemedId) {
        await this.discounts.refundRedeem(redeemedId).catch(() => {})
      }
      throw err
    }
  }

  async getOrderStatus(id: string) {
    const order = await this.orders.findOne(id)
    const [activeAssignment, eventLog] = await Promise.all([
      this.assignments.getActive(id).catch(() => null),
      this.events.listForOrder(id).catch(() => []),
    ])
    return {
      ...order,
      // Public view of the assigned courier — phone is fine to show, MoMo is not.
      activeCourier: activeAssignment?.courier
        ? {
            name: activeAssignment.courier.name,
            phone: activeAssignment.courier.phone,
            vehicle: activeAssignment.courier.vehicle,
            assignmentStatus: activeAssignment.status,
            pickedUpAt: activeAssignment.pickedUpAt,
          }
        : null,
      events: eventLog,
    }
  }
}
