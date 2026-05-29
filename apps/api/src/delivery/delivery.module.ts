import { Module } from '@nestjs/common'
import { DeliveryService } from './delivery.service'
import { DeliveryController } from './delivery.controller'
import { CouriersService } from './couriers.service'
import { AssignmentsService } from './assignments.service'
import { PayoutsService } from './payouts.service'
import { PaymentVerificationsService } from './payment-verifications.service'
import { DeliveryEventsService } from './events.service'
import {
  CouriersController,
  AssignmentsController,
  PayoutsController,
  PaymentVerificationsController,
  DeliveryEventsController,
} from './delivery-v1.controllers'

@Module({
  controllers: [
    DeliveryController,
    CouriersController,
    AssignmentsController,
    PayoutsController,
    PaymentVerificationsController,
    DeliveryEventsController,
  ],
  providers: [
    DeliveryService,
    CouriersService,
    AssignmentsService,
    PayoutsService,
    PaymentVerificationsService,
    DeliveryEventsService,
  ],
  exports: [
    DeliveryService,
    CouriersService,
    AssignmentsService,
    PayoutsService,
    PaymentVerificationsService,
    DeliveryEventsService,
  ],
})
export class DeliveryModule {}
