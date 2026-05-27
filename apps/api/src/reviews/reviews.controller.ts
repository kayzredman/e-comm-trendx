import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ReviewsService } from './reviews.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { Public } from '../auth/public.decorator'

@ApiTags('reviews')
@UseGuards(ClerkGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** Public: list published reviews for a product (called from storefront PDP). */
  @Get('product/:productId')
  @Public()
  listForProduct(@Param('productId') productId: string) {
    return this.reviews.listForProduct(productId)
  }

  /** Public: customer submits a new review (always created as PENDING). */
  @Post()
  @Public()
  create(@Body() body: { productId: string; customerId: string; orderId?: string; rating: number; title?: string; body?: string }) {
    return this.reviews.create(body)
  }

  /** Admin: list every review for moderation. */
  @Get()
  @ApiBearerAuth()
  list() {
    return this.reviews.listAll()
  }

  /** Admin: publish / hide / re-queue. */
  @Patch(':id/status')
  @ApiBearerAuth()
  setStatus(@Param('id') id: string, @Body() body: { status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' }) {
    return this.reviews.setStatus(id, body.status)
  }

  @Delete(':id')
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.reviews.remove(id)
  }
}
