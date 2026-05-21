import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { ClerkGuard } from '../auth/clerk.guard'

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard() { return this.analyticsService.getDashboardStats() }
}
