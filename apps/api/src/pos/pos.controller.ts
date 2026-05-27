import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ClerkGuard } from '../auth/clerk.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { PosService, CheckoutPayload, PosCartItem } from './pos.service'

const POS_ROLES = ['OWNER', 'MANAGER', 'CASHIER'] as const

@ApiTags('pos')
@ApiBearerAuth()
@UseGuards(ClerkGuard, RolesGuard)
@Roles(...POS_ROLES)
@Controller('pos')
export class PosController {
  constructor(private readonly pos: PosService) {}

  // ── Registers ──────────────────────────────────────────────────────────────
  @Get('registers')
  listRegisters() {
    return this.pos.listRegisters()
  }

  @Post('registers')
  @Roles('OWNER', 'MANAGER')
  createRegister(@Body() body: { name: string; location?: string }) {
    return this.pos.createRegister(body)
  }

  // ── Shifts ────────────────────────────────────────────────────────────────
  @Get('shifts/current')
  current(@Req() req: any) {
    return this.pos.currentShift(req.dbUser.id)
  }

  @Post('shifts/open')
  openShift(@Req() req: any, @Body() body: { registerId: string; openingFloat?: number }) {
    return this.pos.openShift(req.dbUser.id, body)
  }

  @Post('shifts/:id/close')
  closeShift(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { closingCash?: number; notes?: string },
  ) {
    return this.pos.closeShift(req.dbUser.id, id, body)
  }

  @Get('shifts/:id/summary')
  summary(@Param('id') id: string) {
    return this.pos.shiftSummary(id)
  }

  @Get('shifts/:id/orders')
  recentOrders(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.pos.listRecentOrders(id, limit ? Number(limit) : undefined)
  }

  // ── Holds ─────────────────────────────────────────────────────────────────
  @Get('holds')
  listHolds(@Query('shiftId') shiftId: string) {
    return this.pos.listHolds(shiftId)
  }

  @Post('holds')
  hold(
    @Req() req: any,
    @Body()
    body: {
      shiftId: string
      label?: string
      customerId?: string | null
      cart: {
        items: PosCartItem[]
        discountAmount?: string
        discountReason?: string
        notes?: string
      }
    },
  ) {
    return this.pos.hold(req.dbUser.id, body)
  }

  @Post('holds/:id/resume')
  resume(@Param('id') id: string) {
    return this.pos.resumeHold(id)
  }

  @Post('holds/:id/void')
  voidHold(@Param('id') id: string) {
    return this.pos.voidHold(id)
  }

  // ── Checkout ──────────────────────────────────────────────────────────────
  @Post('checkout')
  checkout(
    @Req() req: any,
    @Body()
    body: CheckoutPayload & { shiftId: string; registerId: string },
  ) {
    const { shiftId, registerId, ...payload } = body
    return this.pos.checkout(req.dbUser.id, shiftId, registerId, payload)
  }
}
