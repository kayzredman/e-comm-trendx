import { Injectable, BadRequestException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { reviews } from '@trendmarga/db'
import { eq, and, desc } from 'drizzle-orm'

type CreateReviewDto = {
  productId: string
  customerId: string
  orderId?: string
  rating: number
  title?: string
  body?: string
}

@Injectable()
export class ReviewsService {
  constructor(private readonly db: DbService) {}

  listForProduct(productId: string) {
    return this.db.client.query.reviews.findMany({
      where: and(eq(reviews.productId, productId), eq(reviews.status, 'PUBLISHED')),
      orderBy: [desc(reviews.createdAt)],
    })
  }

  listAll() {
    return this.db.client.query.reviews.findMany({
      orderBy: [desc(reviews.createdAt)],
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
