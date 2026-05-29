import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { OrdersService } from './orders.service'
import { ClerkGuard } from '../auth/clerk.guard'

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll() { return this.ordersService.findAll() }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.ordersService.findOne(id) }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: any, @Req() req: any) {
    const u = req?.user
    return this.ordersService.updateStatus(id, status, { id: u?.sub, name: u?.email })
  }
}
