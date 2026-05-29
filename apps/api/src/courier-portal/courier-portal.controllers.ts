import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Public } from '../auth/public.decorator'
import { CourierAuthService } from './courier-auth.service'
import { CourierGuard } from './courier.guard'
import { CourierJobsService } from './courier-jobs.service'
import { CourierEarningsService } from './courier-earnings.service'

function courierFromReq(req: FastifyRequest) {
  return (req as any).courier as { id: string; name: string; phone: string; vehicle: string | null; employmentType: string; commissionPct: string; flatPerDelivery: string | null; momoNumber: string | null; isActive: boolean; notes: string | null; createdAt: Date; updatedAt: Date }
}
function tokenFromReq(req: FastifyRequest) {
  return (req as any).courierToken as string
}

@ApiTags('courier-auth')
@Controller('courier/auth')
export class CourierAuthController {
  constructor(private readonly auth: CourierAuthService) {}

  @Public()
  @Post('request-otp')
  request(@Body() body: { phone: string }) {
    return this.auth.requestOtp(body.phone)
  }

  @Public()
  @Post('verify')
  verify(@Body() body: { phone: string; code: string }, @Headers('user-agent') ua?: string) {
    return this.auth.verifyOtp(body.phone, body.code, ua)
  }

  @UseGuards(CourierGuard)
  @Post('sign-out')
  signOut(@Req() req: FastifyRequest) {
    return this.auth.signOut(tokenFromReq(req))
  }
}

@ApiTags('courier-portal')
@UseGuards(CourierGuard)
@Controller('courier')
export class CourierPortalController {
  constructor(
    private readonly jobs: CourierJobsService,
    private readonly earnings: CourierEarningsService,
  ) {}

  @Get('me')
  me(@Req() req: FastifyRequest) {
    const c = courierFromReq(req)
    return {
      id: c.id, name: c.name, phone: c.phone, vehicle: c.vehicle,
      employmentType: c.employmentType, commissionPct: c.commissionPct,
      momoNumber: c.momoNumber,
    }
  }

  @Get('jobs')
  list(@Req() req: FastifyRequest) {
    return this.jobs.listActive(courierFromReq(req).id)
  }

  @Get('jobs/history')
  history(@Req() req: FastifyRequest) {
    return this.jobs.listHistory(courierFromReq(req).id)
  }

  @Get('jobs/:orderId')
  get(@Param('orderId') orderId: string, @Req() req: FastifyRequest) {
    return this.jobs.get(courierFromReq(req).id, orderId)
  }

  @Post('jobs/:orderId/pickup')
  pickup(@Param('orderId') orderId: string, @Req() req: FastifyRequest) {
    const c = courierFromReq(req)
    return this.jobs.pickup(c.id, orderId, c as any)
  }

  @Post('jobs/:orderId/deliver')
  deliver(
    @Param('orderId') orderId: string,
    @Body() body: { code: string },
    @Req() req: FastifyRequest,
  ) {
    const c = courierFromReq(req)
    return this.jobs.deliver(c.id, orderId, body.code, c as any)
  }

  @Post('jobs/:orderId/fail')
  fail(
    @Param('orderId') orderId: string,
    @Body() body: { reason: string },
    @Req() req: FastifyRequest,
  ) {
    const c = courierFromReq(req)
    return this.jobs.fail(c.id, orderId, body.reason, c as any)
  }

  @Get('earnings')
  myEarnings(@Req() req: FastifyRequest) {
    return this.earnings.forCourier(courierFromReq(req).id)
  }
}
