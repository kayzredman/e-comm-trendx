import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'
import { PaystackClient } from './paystack.client'
import { PaymentsService } from './payments.service'
import { PaymentsController } from './payments.controller'
import { PaymentsReconciler } from './payments.reconciler'

/**
 * Payments module is intentionally self-contained:
 * - Has its own circuit breaker (provider outage doesn't cascade)
 * - Webhook persists raw body before processing (Stripe-style audit log)
 * - Reconciler reconverges any stuck intent every 5 min
 * - Storefront placeOrder NEVER awaits this — intent init is a separate call
 */
@Module({
  imports: [DbModule, AuthModule],
  providers: [PaystackClient, PaymentsService, PaymentsReconciler],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaystackClient],
})
export class PaymentsModule {}
