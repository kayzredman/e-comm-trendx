import { Body, Controller, ForbiddenException, Get, Post } from '@nestjs/common'
import { Public } from '../auth/public.decorator'
import { AssignmentsService } from '../delivery/assignments.service'
import { OrdersService } from '../orders/orders.service'
import { HealthService } from '../health/health.service'

/**
 * DEV-ONLY smoke endpoints. Bypasses auth. Refuses to run when NODE_ENV=production.
 * Used to drive the delivery lifecycle from a terminal without UI clicks.
 */
@Controller('dev/smoke')
export class SmokeController {
  constructor(
    private readonly assignments: AssignmentsService,
    private readonly orders: OrdersService,
    private readonly health: HealthService,
  ) {}

  private guard() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('smoke endpoints disabled in production')
    }
  }

  @Public()
  @Post('assign')
  async assign(@Body() body: { orderId: string; courierId: string }) {
    this.guard()
    return this.assignments.assign(body.orderId, body.courierId, { name: 'smoke' })
  }

  @Public()
  @Post('pickup')
  async pickup(@Body() body: { orderId: string }) {
    this.guard()
    await this.assignments.transition(body.orderId, 'PICKED_UP', { name: 'smoke' })
    return this.orders.updateStatus(body.orderId, 'OUT_FOR_DELIVERY', { name: 'smoke' })
  }

  @Public()
  @Post('deliver')
  async deliver(@Body() body: { orderId: string }) {
    this.guard()
    await this.assignments.transition(body.orderId, 'DELIVERED', { name: 'smoke' })
    return this.orders.updateStatus(body.orderId, 'DELIVERED', { name: 'smoke' })
  }

  @Public()
  @Get('health')
  async healthReport() {
    this.guard()
    return this.health.getReport()
  }
}
