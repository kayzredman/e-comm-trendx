import { Module } from '@nestjs/common'
import { HealthService } from './health.service'
import { HealthController } from './health.controller'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [DbModule, AuthModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
