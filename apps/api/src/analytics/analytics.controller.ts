import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { AnalyticsService, type DashboardPeriod } from './analytics.service'
import { ClerkGuard } from '../auth/clerk.guard'

const VALID_PERIODS: DashboardPeriod[] = ['24h', '7d', '30d', '90d', 'all']

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiQuery({ name: 'period', required: false, enum: VALID_PERIODS })
  getDashboard(@Query('period') period?: string) {
    const p = (VALID_PERIODS as string[]).includes(period ?? '') ? (period as DashboardPeriod) : '30d'
    return this.analyticsService.getDashboardStats(p)
  }
}
