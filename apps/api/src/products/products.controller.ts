import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { Public } from '../auth/public.decorator'

@ApiTags('products')
@UseGuards(ClerkGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  findAll(@Query('status') status?: string, @Query('categoryId') categoryId?: string, @Query('search') search?: string) {
    return this.productsService.findAll({ status, categoryId, search })
  }

  @Get('slug/:slug')
  @Public()
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlug(slug)
    if (!product) throw new NotFoundException('Product not found')
    return product
  }

  @Get(':id')
  @Public()
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

  // ── Variants ────────────────────────────────────────────────────────────
  @Get(':id/variants')
  @Public()
  listVariants(@Param('id') id: string) {
    return this.productsService.listVariants(id)
  }

  @Post(':id/variants')
  @ApiBearerAuth()
  createVariant(@Param('id') id: string, @Body() body: any) {
    return this.productsService.createVariant(id, body)
  }

  @Put(':id/variants')
  @ApiBearerAuth()
  replaceVariants(@Param('id') id: string, @Body() body: { variants: any[] }) {
    return this.productsService.replaceVariants(id, body?.variants ?? [])
  }

  @Patch(':id/variants/:variantId')
  @ApiBearerAuth()
  updateVariant(@Param('variantId') variantId: string, @Body() body: any) {
    return this.productsService.updateVariant(variantId, body)
  }

  @Delete(':id/variants/:variantId')
  @ApiBearerAuth()
  removeVariant(@Param('variantId') variantId: string) {
    return this.productsService.removeVariant(variantId)
  }
}
