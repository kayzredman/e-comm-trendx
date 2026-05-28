import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ImagesService } from './images.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { Public } from '../auth/public.decorator'

@ApiTags('images')
@ApiBearerAuth()
@UseGuards(ClerkGuard, RolesGuard)
@Controller('images')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  /** List images for a product (public for storefront use). */
  @Get()
  @Public()
  list(@Query('productId') productId: string) {
    if (!productId) throw new BadRequestException('productId required')
    return this.images.listForProduct(productId)
  }

  @Post('presign')
  @Roles('OWNER', 'MANAGER', 'CONTENT_EDITOR')
  presign(@Body() body: { productId: string; contentType: string; size: number }) {
    if (!body?.productId || !body?.contentType || !body?.size) {
      throw new BadRequestException('productId, contentType, size required')
    }
    return this.images.presign(body)
  }

  @Post('finalize')
  @Roles('OWNER', 'MANAGER', 'CONTENT_EDITOR')
  finalize(
    @Body() body: { productId: string; tempKey: string; alt?: string; isPrimary?: boolean },
  ) {
    if (!body?.productId || !body?.tempKey) {
      throw new BadRequestException('productId and tempKey required')
    }
    return this.images.finalize(body)
  }

  @Post('external')
  @Roles('OWNER', 'MANAGER', 'CONTENT_EDITOR')
  addExternal(@Body() body: { productId: string; url: string; alt?: string }) {
    if (!body?.productId || !body?.url) throw new BadRequestException('productId and url required')
    return this.images.addExternal(body)
  }

  @Patch(':id')
  @Roles('OWNER', 'MANAGER', 'CONTENT_EDITOR')
  patch(
    @Param('id') id: string,
    @Body() body: { alt?: string; sortOrder?: number; isPrimary?: boolean },
  ) {
    return this.images.patch(id, body)
  }

  @Post('reorder')
  @Roles('OWNER', 'MANAGER', 'CONTENT_EDITOR')
  reorder(@Body() body: { productId: string; ids: string[] }) {
    if (!body?.productId || !Array.isArray(body?.ids)) {
      throw new BadRequestException('productId and ids[] required')
    }
    return this.images.reorder(body.productId, body.ids)
  }

  @Delete(':id')
  @Roles('OWNER', 'MANAGER', 'CONTENT_EDITOR')
  remove(@Param('id') id: string) {
    return this.images.delete(id)
  }
}
