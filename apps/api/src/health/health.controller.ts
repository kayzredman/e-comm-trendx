import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { HealthService, RestartTarget } from './health.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // ── Public ping — used by storefront to check if API is up ──────────────
  @Get()
  ping() {
    return { status: 'ok', ts: new Date().toISOString() }
  }

  // ── Detailed report — OWNER / MANAGER only ───────────────────────────────
  @Get('services')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  getServices() {
    return this.healthService.getReport()
  }

  // ── Re-run a single check ────────────────────────────────────────────────
  @Post('services/:name/recheck')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  recheck(@Param('name') name: string) {
    return this.healthService.recheck(decodeURIComponent(name))
  }

  // ── Tear down the DB pool and reopen ─────────────────────────────────────
  @Post('services/reconnect-db')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  async reconnectDb() {
    const result = await this.healthService.reconnectDatabase()
    return { triggered: true, result }
  }

  // ── Force a V8 garbage collection (only if started with --expose-gc) ────
  @Post('services/gc')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  forceGc() {
    return this.healthService.forceGc()
  }

  // ── Restart a service (api | web) ────────────────────────────────────────
  @Post('services/restart')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER')
  restart(@Body() body: { target: RestartTarget }) {
    return this.healthService.restart(body?.target)
  }
}
