import { Injectable } from '@nestjs/common'
import { ProductsService } from '../products/products.service'
import { CategoriesService } from '../categories/categories.service'
import { CustomersService } from '../customers/customers.service'
import { OrdersService } from '../orders/orders.service'
import { DeliveryService } from '../delivery/delivery.service'
import { CmsService } from '../cms/cms.service'

@Injectable()
export class StorefrontService {
  constructor(
    private readonly products: ProductsService,
    private readonly customers: CustomersService,
    private readonly orders: OrdersService,
    private readonly delivery: DeliveryService,
    private readonly cms: CmsService,
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
    total: number
  }) {
    const customer = await this.customers.upsertByPhone(body.customer as any)
    return this.orders.create({
      order: {
        customerId: customer.id,
        subtotal: String(body.subtotal),
        deliveryFee: String(body.deliveryFee),
        total: String(body.total),
        notes: body.notes,
        paymentMethod: body.paymentMethod ?? 'CASH_ON_DELIVERY',
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
  }

  getOrderStatus(id: string) {
    return this.orders.findOne(id)
  }
}
