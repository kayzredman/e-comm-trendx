import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ReviewsService } from './reviews.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { Public } from '../auth/public.decorator'

@ApiTags('reviews')
@UseGuards(ClerkGuard)
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** Public: list published reviews for a product (storefront PDP). */
  @Get('v1/reviews/product/:productId')
  @Public()
  listForProduct(@Param('productId') productId: string) {
    return this.reviews.listForProduct(productId)
  }

  /** Public: aggregate summary (count, avg, distribution) for a product. */
  @Get('v1/reviews/product/:productId/summary')
  @Public()
  summaryForProduct(@Param('productId') productId: string) {
    return this.reviews.summaryForProduct(productId)
  }

  /** Public: customer submits a review (verified-buyer via orderId + email). Always created PENDING. */
  @Post('v1/reviews')
  @Public()
  submit(@Body() body: { productId: string; orderId: string; email: string; rating: number; title?: string; body?: string }) {
    return this.reviews.submitFromStorefront(body)
  }

  /** Admin: list every review for moderation. */
  @Get('cms/reviews')
  @ApiBearerAuth()
  list() {
    return this.reviews.listAll()
  }

  /** Admin: manually create on behalf of a customer. */
  @Post('cms/reviews')
  @ApiBearerAuth()
  create(@Body() body: { productId: string; customerId: string; orderId?: string; rating: number; title?: string; body?: string }) {
    return this.reviews.create(body)
  }

  /** Admin: publish / hide / re-queue. */
  @Patch('cms/reviews/:id/status')
  @ApiBearerAuth()
  setStatus(@Param('id') id: string, @Body() body: { status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' }) {
    return this.reviews.setStatus(id, body.status)
  }

  @Delete('cms/reviews/:id')
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.reviews.remove(id)
  }
}
