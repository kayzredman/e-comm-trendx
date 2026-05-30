import { Module } from '@nestjs/common'
import { SmokeController } from './smoke.controller'
import { DeliveryModule } from '../delivery/delivery.module'
import { OrdersModule } from '../orders/orders.module'

@Module({
  imports: [DeliveryModule, OrdersModule],
  controllers: [SmokeController],
})
export class SmokeModule {}
