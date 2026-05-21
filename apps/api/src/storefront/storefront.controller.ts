import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { StorefrontService } from './storefront.service'
import { Public } from '../auth/public.decorator'

// All storefront endpoints are public — no auth required
@ApiTags('storefront')
@Public()
@Controller('v1')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('homepage')
  getHomepage() { return this.storefrontService.getHomepage() }

  @Get('products')
  getProducts(@Query('categoryId') categoryId?: string, @Query('search') search?: string) {
    return this.storefrontService.getProducts({ categoryId, search })
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.storefrontService.getProductBySlug(slug)
  }

  @Get('delivery-zones')
  getDeliveryZones() { return this.storefrontService.getDeliveryZones() }

  @Post('orders')
  placeOrder(@Body() body: any) { return this.storefrontService.placeOrder(body) }

  @Get('orders/:id')
  getOrderStatus(@Param('id') id: string) { return this.storefrontService.getOrderStatus(id) }
}
