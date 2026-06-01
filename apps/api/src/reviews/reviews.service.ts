import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { reviews, customers, orders, orderItems } from '@trendmarga/db'
import { eq, and, desc, sql } from 'drizzle-orm'

type CreateReviewDto = {
  productId: string
  customerId: string
  orderId?: string
  rating: number
  title?: string
  body?: string
}

type SubmitStorefrontReviewDto = {
  productId: string
  orderId: string
  email: string
  rating: number
  title?: string
  body?: string
}

export type ReviewSummary = {
  count: number
  avg: number
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
}

@Injectable()
export class ReviewsService {
  constructor(private readonly db: DbService) {}

  listForProduct(productId: string) {
    return this.db.client.query.reviews.findMany({
      where: and(eq(reviews.productId, productId), eq(reviews.status, 'PUBLISHED')),
      orderBy: [desc(reviews.createdAt)],
      with: {
        customer: { columns: { name: true } },
      },
    })
  }

  async summaryForProduct(productId: string): Promise<ReviewSummary> {
    const rows = await this.db.client
      .select({ rating: reviews.rating, n: sql<number>`count(*)::int` })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.status, 'PUBLISHED')))
      .groupBy(reviews.rating)

    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewSummary['distribution']
    let count = 0
    let total = 0
    for (const r of rows) {
      const k = r.rating as 1 | 2 | 3 | 4 | 5
      if (k >= 1 && k <= 5) dist[k] = Number(r.n)
      count += Number(r.n)
      total += Number(r.n) * k
    }
    return { count, avg: count ? Number((total / count).toFixed(2)) : 0, distribution: dist }
  }

  listAll() {
    return this.db.client.query.reviews.findMany({
      orderBy: [desc(reviews.createdAt)],
      with: {
        customer: { columns: { name: true, email: true } },
        product: { columns: { name: true, slug: true } },
      },
    })
  }

  async create(dto: CreateReviewDto) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('rating must be between 1 and 5')
    }
    const [r] = await this.db.client.insert(reviews).values({
      productId: dto.productId,
      customerId: dto.customerId,
      orderId: dto.orderId,
      rating: dto.rating,
      title: dto.title,
      body: dto.body,
      status: 'PENDING',
    }).returning()
    return r
  }

  /** Storefront submission — verifies order belongs to email and contains the product. */
  async submitFromStorefront(dto: SubmitStorefrontReviewDto) {
    if (!dto.email || !dto.orderId || !dto.productId) {
      throw new BadRequestException('orderId, email, and productId are required')
    }
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('rating must be between 1 and 5')
    }

    const [order] = await this.db.client.select().from(orders).where(eq(orders.id, dto.orderId)).limit(1)
    if (!order) throw new NotFoundException('order not found')
    if (!order.customerId) throw new ForbiddenException('order has no customer')

    const [customer] = await this.db.client.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
    if (!customer) throw new ForbiddenException('customer not found')
    if ((customer.email ?? '').trim().toLowerCase() !== dto.email.trim().toLowerCase()) {
      throw new ForbiddenException('email does not match this order')
    }

    const [item] = await this.db.client
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, dto.orderId), eq(orderItems.productId, dto.productId)))
      .limit(1)
    if (!item) throw new BadRequestException('product is not part of this order')

    const [existing] = await this.db.client
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(
        eq(reviews.orderId, dto.orderId),
        eq(reviews.productId, dto.productId),
        eq(reviews.customerId, order.customerId),
      ))
      .limit(1)
    if (existing) throw new BadRequestException('you have already reviewed this product for this order')

    const [r] = await this.db.client.insert(reviews).values({
      productId: dto.productId,
      customerId: order.customerId,
      orderId: dto.orderId,
      rating: dto.rating,
      title: dto.title?.trim() || null,
      body: dto.body?.trim() || null,
      status: 'PENDING',
    }).returning()
    return { id: r.id, status: r.status }
  }

  async setStatus(id: string, status: 'PENDING' | 'PUBLISHED' | 'HIDDEN') {
    const [r] = await this.db.client
      .update(reviews)
      .set({ status })
      .where(eq(reviews.id, id))
      .returning()
    return r
  }

  async remove(id: string) {
    await this.db.client.delete(reviews).where(eq(reviews.id, id))
  }
}
