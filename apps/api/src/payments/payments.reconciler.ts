import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PaymentsService } from './payments.service'

/**
 * 5-minute sweep: any intent stuck in REQUIRES_AUTH/PROCESSING > 10 min
 * is re-verified via Paystack /transaction/verify and converged.
 *
 * Held in a plain interval (not @nestjs/schedule) to keep the module dep-free.
 */
@Injectable()
export class PaymentsReconciler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsReconciler.name)
  private timer: NodeJS.Timeout | null = null
  private readonly intervalMs = 5 * 60_000

  constructor(private readonly payments: PaymentsService) {}

  onModuleInit() {
    if (process.env.PAYSTACK_ENABLED !== 'true') return
    // Initial run after 30s so app boots cleanly first.
    setTimeout(() => this.tick(), 30_000)
    this.timer = setInterval(() => this.tick(), this.intervalMs)
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  private async tick() {
    try {
      const r = await this.payments.reconcileStuck(10)
      if (r.checked > 0) {
        this.logger.log(`reconcile: checked=${r.checked} converged=${r.converged}`)
      }
    } catch (err) {
      this.logger.warn(`reconcile tick failed: ${(err as Error)?.message}`)
    }
  }
}
