/**
 * Minimal in-process circuit breaker.
 *
 * State machine: CLOSED → OPEN (after N failures in window) → HALF_OPEN
 * (after cool-down) → CLOSED on first success or OPEN again on failure.
 *
 * Why hand-rolled: opossum is great but pulls a lot of deps; for one
 * external provider with simple needs an inline ~80 LOC class is clearer
 * and avoids surprise behavior.
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  failureThreshold: number
  rollingWindowMs: number
  openDurationMs: number
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failures: number[] = []
  private openedAt = 0
  private lastError: string | null = null
  private consecutiveSuccesses = 0
  private totalCalls = 0
  private totalFailures = 0

  constructor(
    public readonly name: string,
    private readonly opts: CircuitBreakerOptions = {
      failureThreshold: 5,
      rollingWindowMs: 30_000,
      openDurationMs: 60_000,
    },
  ) {}

  canCall(): boolean {
    if (this.state === 'CLOSED') return true
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt >= this.opts.openDurationMs) {
        this.state = 'HALF_OPEN'
        return true
      }
      return false
    }
    // HALF_OPEN — allow probe traffic
    return true
  }

  recordSuccess(): void {
    this.totalCalls++
    this.consecutiveSuccesses++
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED'
      this.failures = []
    }
  }

  recordFailure(err: unknown): void {
    this.totalCalls++
    this.totalFailures++
    this.consecutiveSuccesses = 0
    this.lastError = err instanceof Error ? err.message : String(err)
    const now = Date.now()
    this.failures = this.failures.filter(t => now - t <= this.opts.rollingWindowMs)
    this.failures.push(now)
    if (this.state === 'HALF_OPEN') {
      this.trip()
    } else if (this.failures.length >= this.opts.failureThreshold) {
      this.trip()
    }
  }

  private trip(): void {
    this.state = 'OPEN'
    this.openedAt = Date.now()
  }

  snapshot() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures.length,
      threshold: this.opts.failureThreshold,
      windowMs: this.opts.rollingWindowMs,
      cooldownMs: this.opts.openDurationMs,
      msUntilHalfOpen: this.state === 'OPEN'
        ? Math.max(0, this.opts.openDurationMs - (Date.now() - this.openedAt))
        : 0,
      lastError: this.lastError,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
    }
  }
}
