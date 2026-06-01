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

  // ── Run all diagnostics and return findings + suggested fixes ──────────
  @Post('diagnostics')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  runDiagnostics() {
    return this.healthService.runDiagnostics()
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

  // ── Restart everything (api + web). Dev: touch both files. Prod: Railway redeploy both. ──
  @Post('services/restart-all')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER')
  async restartAll() {
    const [api, web] = await Promise.all([
      this.healthService.restart('api'),
      this.healthService.restart('web'),
    ])
    return { api, web }
  }

  // ── Supervisor state (dev only, reads /tmp/trendx-supervisor.json) ──────
  @Get('services/supervisor')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  supervisor() {
    return this.healthService.getSupervisorState()
  }

  // ── Tier 2: warm storefront read endpoints (idempotent, read-only) ──────
  @Post('services/warm-cache')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER')
  warmCache() {
    return this.healthService.warmStorefrontCache()
  }

  // ── Tier 2: reseed default delivery zones (idempotent UPSERT) ───────────
  @Post('services/reseed-zones')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER')
  reseedZones() {
    return this.healthService.reseedDeliveryZones()
  }
}
