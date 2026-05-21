import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { Public } from '../auth/public.decorator'

@ApiTags('products')
@UseGuards(ClerkGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Public — storefront can also use StorefrontController but this handles CMS
  @Get()
  @ApiBearerAuth()
  findAll(@Query('status') status?: string, @Query('categoryId') categoryId?: string, @Query('search') search?: string) {
    return this.productsService.findAll({ status, categoryId, search })
  }

  @Get(':id')
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id)
  }

  @Post()
  @ApiBearerAuth()
  create(@Body() body: any) {
    return this.productsService.create(body)
  }

  @Patch(':id')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() body: any) {
    return this.productsService.update(id, body)
  }

  @Delete(':id')
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.productsService.remove(id)
  }
}
