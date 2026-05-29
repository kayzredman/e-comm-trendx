import { Module } from '@nestjs/common'
import { DeliveryModule } from '../delivery/delivery.module'
import { OrdersModule } from '../orders/orders.module'
import { CourierAuthService } from './courier-auth.service'
import { CourierGuard } from './courier.guard'
import { CourierJobsService } from './courier-jobs.service'
import { CourierEarningsService } from './courier-earnings.service'
import { CourierAuthController, CourierPortalController } from './courier-portal.controllers'

@Module({
  imports: [DeliveryModule, OrdersModule],
  controllers: [CourierAuthController, CourierPortalController],
  providers: [CourierAuthService, CourierGuard, CourierJobsService, CourierEarningsService],
  exports: [CourierAuthService],
})
export class CourierPortalModule {}
