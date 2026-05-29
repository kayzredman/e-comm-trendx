import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ClerkGuard } from '../auth/clerk.guard'
import { CouriersService } from './couriers.service'
import { AssignmentsService } from './assignments.service'
import { PayoutsService } from './payouts.service'
import { PaymentVerificationsService } from './payment-verifications.service'
import { DeliveryEventsService } from './events.service'

function actor(req: any): { id?: string; name?: string } {
  const u = req?.user
  return { id: u?.sub, name: u?.email ?? u?.name }
}

@ApiTags('couriers')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('couriers')
export class CouriersController {
  constructor(private readonly couriers: CouriersService) {}

  @Get()
  list() { return this.couriers.list() }

  @Get('stats')
  withStats() { return this.couriers.listWithStats() }

  @Get(':id')
  get(@Param('id') id: string) { return this.couriers.get(id) }

  @Post()
  create(@Body() body: any) { return this.couriers.create(body) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.couriers.update(id, body) }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) { return this.couriers.deactivate(id) }
}

@ApiTags('delivery-assignments')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('delivery/assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post()
  assign(@Body() body: { orderId: string; courierId: string }, @Req() req: any) {
    return this.assignments.assign(body.orderId, body.courierId, actor(req))
  }

  @Patch(':orderId/transition')
  transition(
    @Param('orderId') orderId: string,
    @Body() body: { next: 'PICKED_UP' | 'DELIVERED' | 'FAILED'; reason?: string },
    @Req() req: any,
  ) {
    return this.assignments.transition(orderId, body.next, { ...actor(req), reason: body.reason })
  }

  @Get('order/:orderId')
  forOrder(@Param('orderId') orderId: string) { return this.assignments.getForOrder(orderId) }
}

@ApiTags('payouts')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get('summary')
  summary() { return this.payouts.summary() }

  @Get('recent')
  recent() { return this.payouts.listRecent() }

  @Post('pay/:courierId')
  pay(
    @Param('courierId') courierId: string,
    @Body() body: { method?: 'MOMO' | 'CASH' | 'BANK'; reference?: string; notes?: string },
    @Req() req: any,
  ) {
    return this.payouts.payCourier(courierId, { ...body, paidBy: actor(req).id })
  }
}

@ApiTags('payment-verifications')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('payment-verifications')
export class PaymentVerificationsController {
  constructor(private readonly pv: PaymentVerificationsService) {}

  @Get()
  list() { return this.pv.listPending() }

  @Get('stats')
  stats() { return this.pv.stats() }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Req() req: any) {
    return this.pv.confirm(id, actor(req))
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.pv.reject(id, body.reason ?? 'Rejected', actor(req))
  }
}

@ApiTags('delivery-events')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('delivery/events')
export class DeliveryEventsController {
  constructor(private readonly events: DeliveryEventsService) {}

  @Get(':orderId')
  forOrder(@Param('orderId') orderId: string) { return this.events.listForOrder(orderId) }
}
