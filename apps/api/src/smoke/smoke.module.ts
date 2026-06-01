import { Module } from '@nestjs/common'
import { SmokeController } from './smoke.controller'
import { DeliveryModule } from '../delivery/delivery.module'
import { OrdersModule } from '../orders/orders.module'
import { HealthModule } from '../health/health.module'

@Module({
  imports: [DeliveryModule, OrdersModule, HealthModule],
  controllers: [SmokeController],
})
export class SmokeModule {}
