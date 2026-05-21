import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DeliveryService } from './delivery.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { Public } from '../auth/public.decorator'

@ApiTags('delivery')
@UseGuards(ClerkGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('zones')
  @Public()
  getZones() { return this.deliveryService.getZones() }

  @Get('zones/all')
  @ApiBearerAuth()
  getAllZones() { return this.deliveryService.getAllZones() }

  @Get('fee')
  @Public()
  calcFee(
    @Query('zoneId') zoneId: string,
    @Query('total') total: string,
    @Query('km') km?: string,
  ) {
    return this.deliveryService.calculateFee(zoneId, Number(total), km ? Number(km) : undefined)
  }

  @Post('zones')
  @ApiBearerAuth()
  upsertZone(@Body() body: any) { return this.deliveryService.upsertZone(body) }

  @Delete('zones/:id')
  @ApiBearerAuth()
  deleteZone(@Param('id') id: string) { return this.deliveryService.deleteZone(id) }
}
