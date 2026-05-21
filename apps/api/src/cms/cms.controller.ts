import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CmsService } from './cms.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { Public } from '../auth/public.decorator'

@ApiTags('cms')
@UseGuards(ClerkGuard)
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('sections')
  @Public()
  getSections(@Query('page') page?: string) {
    return this.cmsService.getPageSections(page)
  }

  @Post('sections')
  @ApiBearerAuth()
  upsertSection(@Body() body: any) {
    return this.cmsService.upsertSection(body)
  }

  @Delete('sections/:id')
  @ApiBearerAuth()
  removeSection(@Param('id') id: string) {
    return this.cmsService.remove(id)
  }
}
