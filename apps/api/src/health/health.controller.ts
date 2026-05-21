import { Controller, Get, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { HealthService } from './health.service'
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

  // ── Manual DB reconnect trigger ──────────────────────────────────────────
  @Post('services/reconnect-db')
  @ApiBearerAuth()
  @UseGuards(ClerkGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  async reconnectDb() {
    // Re-run the DB check and return latest result
    const report = await this.healthService.getReport()
    const dbService = report.services.find(s => s.name === 'PostgreSQL')
    return { triggered: true, result: dbService }
  }
}
