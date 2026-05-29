import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DiscountsService } from './discounts.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { Public } from '../auth/public.decorator'

@ApiTags('discounts')
@UseGuards(ClerkGuard)
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  /** Admin: list all codes. */
  @Get()
  @ApiBearerAuth()
  list() {
    return this.discounts.list()
  }

  /** Public: list currently-redeemable promoted codes for storefront surfacing. */
  @Get('promoted')
  @Public()
  listPromoted() {
    return this.discounts.listPromoted()
  }

  /** Admin: create or update a code. */
  @Post()
  @ApiBearerAuth()
  upsert(@Body() body: any) {
    return this.discounts.upsert(body)
  }

  @Delete(':id')
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.discounts.remove(id)
  }

  /** Public: validate a code at checkout. */
  @Post('validate')
  @Public()
  validate(@Body() body: { code: string; subtotal: number }) {
    return this.discounts.validate(body.code, body.subtotal)
  }
}
