import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { Public } from '../auth/public.decorator'

@ApiTags('categories')
@UseGuards(ClerkGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  findAll() { return this.categoriesService.findAll() }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) { return this.categoriesService.findBySlug(slug) }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) { return this.categoriesService.findOne(id) }

  @Post()
  @ApiBearerAuth()
  create(@Body() body: any) { return this.categoriesService.create(body) }

  @Patch(':id')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() body: any) { return this.categoriesService.update(id, body) }

  @Delete(':id')
  @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.categoriesService.remove(id) }
}
