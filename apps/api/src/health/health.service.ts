import { Injectable, Logger, BadRequestException, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { PaymentsService } from '../payments/payments.service'
import { PaystackClient } from '../payments/paystack.client'
import { sql } from 'drizzle-orm'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import * as v8 from 'node:v8'
import { monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks'

export type ServiceStatus = 'healthy' | 'degraded' | 'down'
export type ServiceKind = 'database' | 'self' | 'http' | 'auth' | 'payment'
export type RestartTarget = 'api' | 'web'
export type RestartMethod = 'railway' | 'tsx-watch' | 'next-watch' | 'unsupported'

export interface ServiceCheck {
  name: string
  kind: ServiceKind
  status: ServiceStatus
  latencyMs: number | null
  message: string
  checkedAt: string
  url?: string
  actions?: Array<'reconnect' | 'recheck' | 'restart' | 'gc'>
  /** Optional key/value details rendered as a chip grid in the UI */
  details?: Record<string, string | number | boolean>
}

export type FindingSeverity = 'critical' | 'warning' | 'info'

export interface DiagnosticFinding {
  id: string
  service: string
  severity: FindingSeverity
  title: string
  message: string
  suggestion: string
  /** Optional shell command users can copy to remediate. */
  command?: string
  /** Optional pointer to docs/runbook. */
  docsHint?: string
  /** If true, hints that a built-in remediation action exists (future Tier 2). */
  remediable?: boolean
}

export interface DiagnosticsReport {
  ranAt: string
  durationMs: number
  overall: ServiceStatus
  summary: {
    total: number
    critical: number
    warning: number
    info: number
    healthyServices: number
    totalServices: number
  }
  findings: DiagnosticFinding[]
}

export interface HealthReport {
  overall: ServiceStatus
  services: ServiceCheck[]
  serverUptimeSeconds: number
  memoryMB: { used: number; total: number; limit?: number; percent: number; rssMB: number; externalMB: number; arrayBuffersMB: number }
  cpu: { user: number; system: number; loadAvg1: number; loadAvg5: number; loadAvg15: number; coreCount: number }
  eventLoop: { lagMeanMs: number; lagP99Ms: number; lagMaxMs: number }
  process: {
    nodeVersion: string
    pid: number
    env: string
    platform: string
    arch: string
    apiVersion: string
    startedAt: string
    activeHandles: number
    activeRequests: number
  }
  capabilities: {
    canRestartApi: RestartMethod
    canRestartWeb: RestartMethod
    canForceGc: boolean
    canReconnectDb: boolean
  }
  checkedAt: string
}

@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name)
  private readonly startTime = Date.now()
  private readonly startedAt = new Date().toISOString()
  private loopHistogram: IntervalHistogram | null = null
  private apiVersion = '0.0.0'

  constructor(
    private readonly db: DbService,
    private readonly payments: PaymentsService,
    private readonly paystack: PaystackClient,
  ) {}

  onModuleInit() {
    this.loopHistogram = monitorEventLoopDelay({ resolution: 20 })
    this.loopHistogram.enable()
    void this.loadApiVersion()
  }

  onModuleDestroy() {
    this.loopHistogram?.disable()
  }

  private async loadApiVersion(): Promise<void> {
    for (const rel of ['../../package.json', '../../../package.json']) {
      try {
        const p = path.resolve(__dirname, rel)
        const raw = await fs.readFile(p, 'utf-8')
        const json = JSON.parse(raw) as { name?: string; version?: string }
        if (json?.name === '@trendmarga/api' && json.version) {
          this.apiVersion = json.version
          return
        }
      } catch {
        // try next
      }
    }
  }

  async getReport(): Promise<HealthReport> {
    const [dbCheck, schemaCheck, apiCheck, webCheck, storefrontCheck, clerkCheck, paystackApi, paystackWebhook, paystackRecon] = await Promise.all([
      this.checkDatabase(),
      this.checkSchema(),
      this.checkSelf(),
      this.checkHttp('Web App', process.env.WEB_URL),
      this.checkHttp('Storefront', process.env.STOREFRONT_URL),
      this.checkClerk(),
      this.checkPaystackApi(),
      this.checkPaystackWebhook(),
      this.checkPaystackReconciliation(),
    ])

    const services = [dbCheck, schemaCheck, apiCheck, webCheck, storefrontCheck, clerkCheck, paystackApi, paystackWebhook, paystackRecon].filter(Boolean) as ServiceCheck[]

    const overall: ServiceStatus =
      services.some(s => s.status === 'down') ? 'down' :
      services.some(s => s.status === 'degraded') ? 'degraded' : 'healthy'

    const mem = process.memoryUsage()
    // IMPORTANT: heapTotal is the currently-committed heap, not the limit. V8 grows the
    // heap on demand up to heap_size_limit (--max-old-space-size, default ~4GB). Using
    // heapUsed/heapTotal produces false "97% full" alarms on small processes.
    const heapLimitBytes = v8.getHeapStatistics().heap_size_limit
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024)
    const limitMB = Math.round(heapLimitBytes / 1024 / 1024)
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024)
    const rssMB = Math.round(mem.rss / 1024 / 1024)
    const externalMB = Math.round((mem.external || 0) / 1024 / 1024)
    const arrayBuffersMB = Math.round((mem.arrayBuffers || 0) / 1024 / 1024)
    const cpu = process.cpuUsage()
    const load = os.loadavg()
    const loop = this.readLoopLag()

    const proc = process as unknown as { _getActiveHandles?: () => unknown[]; _getActiveRequests?: () => unknown[] }
    const activeHandles = typeof proc._getActiveHandles === 'function' ? proc._getActiveHandles().length : 0
    const activeRequests = typeof proc._getActiveRequests === 'function' ? proc._getActiveRequests().length : 0

    return {
      overall,
      services,
      serverUptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      memoryMB: {
        used: usedMB,
        total: totalMB,
        limit: limitMB,
        percent: limitMB > 0 ? Math.round((usedMB / limitMB) * 100) : 0,
        rssMB,
        externalMB,
        arrayBuffersMB,
      },
      cpu: {
        user: cpu.user,
        system: cpu.system,
        loadAvg1: Number(load[0].toFixed(2)),
        loadAvg5: Number(load[1].toFixed(2)),
        loadAvg15: Number(load[2].toFixed(2)),
        coreCount: os.cpus().length,
      },
      eventLoop: loop,
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        env: process.env.NODE_ENV ?? 'development',
        platform: process.platform,
        arch: process.arch,
        apiVersion: this.apiVersion,
        startedAt: this.startedAt,
        activeHandles,
        activeRequests,
      },
      capabilities: {
        canRestartApi: this.restartMethodFor('api'),
        canRestartWeb: this.restartMethodFor('web'),
        canForceGc: typeof global.gc === 'function',
        canReconnectDb: true,
      },
      checkedAt: new Date().toISOString(),
    }
  }

  private readLoopLag(): { lagMeanMs: number; lagP99Ms: number; lagMaxMs: number } {
    if (!this.loopHistogram) return { lagMeanMs: 0, lagP99Ms: 0, lagMaxMs: 0 }
    const ns = 1_000_000
    return {
      lagMeanMs: Number((this.loopHistogram.mean / ns).toFixed(2)),
      lagP99Ms: Number((this.loopHistogram.percentile(99) / ns).toFixed(2)),
      lagMaxMs: Number((this.loopHistogram.max / ns).toFixed(2)),
    }
  }

  private formatUptime(s: number): string {
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m ${s % 60}s`
  }

  // ─── individual checks ──────────────────────────────────────────────────

  /**
   * Schema sanity / migration-drift detector.
   *
   * Probes a curated list of "canary" columns that have been added by recent
   * Drizzle migrations. If any SELECT throws (typically `column X does not
   * exist`), the deployed DB is behind the codebase and the dashboard's
   * authenticated queries will silently 500. This check surfaces that on the
   * Service Quality page with the exact missing column and the migration to
   * run.
   *
   * Update CANARY_COLUMNS whenever a new migration adds a column the API
   * actively reads in non-trivial code paths.
   */
  private async checkSchema(): Promise<ServiceCheck> {
    const checkedAt = new Date().toISOString()
    const t0 = Date.now()
    // [table, column, introduced-by-migration]
    const CANARY_COLUMNS: Array<[string, string, string]> = [
      ['orders',        'source',     '0002_robust_brother_voodoo'],
      ['pos_registers', 'id',         '0003_pos_feature'],
      ['pos_shifts',    'id',         '0003_pos_feature'],
      ['pos_holds',     'id',         '0003_pos_feature'],
    ]
    try {
      const appliedRows = await this.db.client.execute(
        sql`SELECT COUNT(*)::int AS n FROM drizzle.__drizzle_migrations`,
      )
      const applied = Number(
        ((appliedRows as unknown as Array<Record<string, unknown>>)[0]?.n) ?? 0,
      )

      const missing: string[] = []
      for (const [table, column, migration] of CANARY_COLUMNS) {
        try {
          await this.db.client.execute(
            sql.raw(`SELECT "${column}" FROM "${table}" LIMIT 1`),
          )
        } catch (err: any) {
          const msg = String(err?.message ?? '')
          if (/does not exist|undefined column|relation .* does not exist/i.test(msg)) {
            missing.push(`${table}.${column} (run ${migration})`)
          } else {
            // unrelated error — surface but don't claim drift
            return {
              name: 'Schema',
              kind: 'database',
              status: 'degraded',
              latencyMs: Date.now() - t0,
              message: `Canary probe ${table}.${column} failed: ${msg.slice(0, 120)}`,
              checkedAt,
              actions: ['recheck'],
              details: { appliedMigrations: applied },
            }
          }
        }
      }

      const latencyMs = Date.now() - t0
      if (missing.length > 0) {
        return {
          name: 'Schema',
          kind: 'database',
          status: 'down',
          latencyMs,
          message: `Migration drift — missing: ${missing.join(', ')}`,
          checkedAt,
          actions: ['recheck'],
          details: {
            appliedMigrations: applied,
            missingCount: missing.length,
            fix: 'Run: pnpm migrate:<env>  (or drizzle-kit migrate)',
          },
        }
      }
      return {
        name: 'Schema',
        kind: 'database',
        status: 'healthy',
        latencyMs,
        message: `${applied} migrations applied · ${CANARY_COLUMNS.length} canary columns OK`,
        checkedAt,
        actions: ['recheck'],
        details: {
          appliedMigrations: applied,
          canaryColumns: CANARY_COLUMNS.length,
          checkLatency: `${latencyMs}ms`,
        },
      }
    } catch (err: any) {
      return {
        name: 'Schema',
        kind: 'database',
        status: 'down',
        latencyMs: null,
        message: err?.message ?? 'Schema check failed',
        checkedAt,
        actions: ['recheck'],
      }
    }
  }

  private async checkDatabase(): Promise<ServiceCheck> {
    const t0 = Date.now()
    try {
      const rows = await this.db.client.execute(
        sql`SELECT version() as version, current_database() as db`,
      )
      const latencyMs = Date.now() - t0
      const row = (rows as unknown as Array<Record<string, unknown>>)[0] ?? {}
      const versionStr = String(row.version ?? '')
      const dbName = String(row.db ?? '')
      const shortVersion = versionStr.match(/PostgreSQL\s+[\d.]+/)?.[0] ?? versionStr.slice(0, 32)
      return {
        name: 'PostgreSQL',
        kind: 'database',
        status: latencyMs > 500 ? 'degraded' : 'healthy',
        latencyMs,
        message: latencyMs > 500 ? `High latency: ${latencyMs}ms` : 'Connected and responsive',
        checkedAt: new Date().toISOString(),
        actions: ['reconnect', 'recheck'],
        details: {
          version: shortVersion || 'unknown',
          database: dbName || 'unknown',
          poolSize: 10,
        },
      }
    } catch (err: any) {
      return {
        name: 'PostgreSQL',
        kind: 'database',
        status: 'down',
        latencyMs: null,
        message: err?.message ?? 'Connection failed',
        checkedAt: new Date().toISOString(),
        actions: ['reconnect', 'recheck'],
      }
    }
  }

  private async checkSelf(): Promise<ServiceCheck> {
    const mem = process.memoryUsage()
    const heapLimitBytes = v8.getHeapStatistics().heap_size_limit
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024)
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024)
    const limitMB = Math.round(heapLimitBytes / 1024 / 1024)
    const rssMB = Math.round(mem.rss / 1024 / 1024)
    // Percentage is against the real V8 heap limit, not the currently-committed heap.
    const percent = limitMB > 0 ? Math.round((usedMB / limitMB) * 100) : 0
    const loop = this.readLoopLag()
    const status: ServiceStatus =
      percent > 95 || loop.lagP99Ms > 1000 ? 'down' :
      percent > 90 || loop.lagP99Ms > 250 ? 'degraded' : 'healthy'

    return {
      name: 'API Server',
      kind: 'self',
      status,
      latencyMs: Math.round(loop.lagMeanMs),
      message: status !== 'healthy'
        ? `Heap ${usedMB}/${limitMB}MB (${percent}%) \u00b7 loop p99 ${loop.lagP99Ms}ms`
        : `Heap ${usedMB}/${limitMB}MB (${percent}%) \u00b7 RSS ${rssMB}MB \u00b7 loop ${loop.lagMeanMs}ms`,
      checkedAt: new Date().toISOString(),
      actions: ['restart', 'gc', 'recheck'],
      details: {
        version: this.apiVersion,
        node: process.version,
        platform: `${process.platform}/${process.arch}`,
        env: process.env.NODE_ENV ?? 'development',
        pid: process.pid,
        port: Number(process.env.API_PORT ?? 4000),
        heap: `${usedMB}/${limitMB}MB (${percent}%)`,
        heapCommitted: `${totalMB}MB`,
        rss: `${rssMB}MB`,
        loopMean: `${loop.lagMeanMs}ms`,
        loopP99: `${loop.lagP99Ms}ms`,
        loopMax: `${loop.lagMaxMs}ms`,
        uptime: this.formatUptime(Math.floor((Date.now() - this.startTime) / 1000)),
        startedAt: this.startedAt,
        gcExposed: typeof global.gc === 'function',
      },
    }
  }

  private async checkHttp(name: string, url: string | undefined): Promise<ServiceCheck | null> {
    if (!url) return null
    const t0 = Date.now()
    const probeUrl = this.buildProbeUrl(url)
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 4000)
      const res = await fetch(probeUrl, { method: 'GET', signal: ctrl.signal, redirect: 'manual' })
      clearTimeout(timer)
      const latencyMs = Date.now() - t0
      const ok = res.status < 500
      const server = res.headers.get('server') ?? res.headers.get('x-powered-by') ?? null
      return {
        name,
        kind: 'http',
        status: !ok ? 'down' : latencyMs > 1500 ? 'degraded' : 'healthy',
        latencyMs,
        message: ok
          ? `HTTP ${res.status} in ${latencyMs}ms`
          : `Returned ${res.status} ${res.statusText || ''}`.trim(),
        checkedAt: new Date().toISOString(),
        url: probeUrl,
        actions: name === 'Web App' ? ['restart', 'recheck'] : ['recheck'],
        details: {
          url: probeUrl,
          status: res.status,
          ...(server ? { server } : {}),
        },
      }
    } catch (err: any) {
      return {
        name,
        kind: 'http',
        status: 'down',
        latencyMs: null,
        message: err?.name === 'AbortError' ? 'Timed out after 4s' : (err?.message ?? 'Unreachable'),
        checkedAt: new Date().toISOString(),
        url: probeUrl,
        actions: name === 'Web App' ? ['restart', 'recheck'] : ['recheck'],
        details: { url: probeUrl, error: err?.name === 'AbortError' ? 'timeout' : 'unreachable' },
      }
    }
  }

  /**
   * Probe Clerk by hitting their JWKS endpoint with the secret key as Bearer.
   * 200 → key is valid and service is reachable.
   */
  private async checkClerk(): Promise<ServiceCheck> {
    const checkedAt = new Date().toISOString()
    const secret = process.env.CLERK_SECRET_KEY
    if (!secret) {
      return {
        name: 'Clerk Auth', kind: 'auth', status: 'down', latencyMs: null,
        message: 'CLERK_SECRET_KEY not configured', checkedAt,
        actions: ['recheck'],
      }
    }
    const t0 = Date.now()
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 4000)
      const res = await fetch('https://api.clerk.com/v1/jwks', {
        method: 'GET',
        headers: { Authorization: `Bearer ${secret}` },
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      const latencyMs = Date.now() - t0
      const mode = secret.startsWith('sk_test_') ? 'test' : secret.startsWith('sk_live_') ? 'live' : 'unknown'
      if (res.status === 200) {
        return {
          name: 'Clerk Auth', kind: 'auth',
          status: latencyMs > 1500 ? 'degraded' : 'healthy',
          latencyMs,
          message: `Authenticated in ${latencyMs}ms (${mode} mode)`,
          checkedAt,
          url: 'https://api.clerk.com/v1/jwks',
          actions: ['recheck'],
          details: { mode, status: res.status, latency: `${latencyMs}ms` },
        }
      }
      return {
        name: 'Clerk Auth', kind: 'auth', status: 'down', latencyMs,
        message: `Clerk returned HTTP ${res.status}`,
        checkedAt,
        url: 'https://api.clerk.com/v1/jwks',
        actions: ['recheck'],
        details: { mode, status: res.status },
      }
    } catch (err: any) {
      return {
        name: 'Clerk Auth', kind: 'auth', status: 'down', latencyMs: null,
        message: err?.name === 'AbortError' ? 'Timed out after 4s' : (err?.message ?? 'Unreachable'),
        checkedAt,
        url: 'https://api.clerk.com/v1/jwks',
        actions: ['recheck'],
      }
    }
  }

  private buildProbeUrl(base: string): string {
    try {
      const u = new URL(base)
      if (u.pathname === '') u.pathname = '/'
      return u.toString()
    } catch {
      return base
    }
  }

  // ─── Paystack observability ─────────────────────────────────────────────

  private async checkPaystackApi(): Promise<ServiceCheck> {
    const checkedAt = new Date().toISOString()
    const mode = this.paystack.mode()
    const cb = this.paystack.breaker.snapshot()
    if (mode === 'unconfigured') {
      return {
        name: 'Paystack API', kind: 'payment', status: 'degraded', latencyMs: null,
        message: 'PAYSTACK_SECRET_KEY not configured — online payments disabled',
        checkedAt, actions: ['recheck'],
        details: { mode, breaker: cb.state },
      }
    }
    if (cb.state === 'OPEN') {
      return {
        name: 'Paystack API', kind: 'payment', status: 'down', latencyMs: null,
        message: `Circuit breaker OPEN — ${cb.failures} failures, ${Math.round(cb.msUntilHalfOpen / 1000)}s until probe`,
        checkedAt, actions: ['recheck'],
        details: { mode, breaker: cb.state, lastError: cb.lastError ?? 'n/a' },
      }
    }
    try {
      const r = await this.paystack.ping()
      return {
        name: 'Paystack API', kind: 'payment',
        status: r.latencyMs > 2000 ? 'degraded' : 'healthy',
        latencyMs: r.latencyMs,
        message: `Reachable in ${r.latencyMs}ms (${mode} mode)`,
        checkedAt,
        url: 'https://api.paystack.co/bank',
        actions: ['recheck'],
        details: { mode, breaker: cb.state, totalCalls: cb.totalCalls, totalFailures: cb.totalFailures },
      }
    } catch (err: any) {
      return {
        name: 'Paystack API', kind: 'payment', status: 'down', latencyMs: null,
        message: err?.message?.slice(0, 200) ?? 'Unreachable',
        checkedAt, actions: ['recheck'],
        details: { mode, breaker: cb.state },
      }
    }
  }

  private async checkPaystackWebhook(): Promise<ServiceCheck> {
    const checkedAt = new Date().toISOString()
    try {
      const stats = await this.payments.getStats()
      const stuck = stats.stuckIntents
      const errored = stats.eventsWithErrors24h
      let status: ServiceStatus = 'healthy'
      let message = `${stats.last24h.succeeded} succeeded / ${stats.last24h.failed} failed in last 24h`
      if (errored > 0) {
        status = errored > 5 ? 'down' : 'degraded'
        message = `${errored} webhook events with processing errors in last 24h`
      } else if (stuck > 5) {
        status = 'down'
        message = `${stuck} intents stuck > 10min — webhook may not be reaching API`
      } else if (stuck > 0) {
        status = 'degraded'
        message = `${stuck} intent(s) pending > 10min`
      }
      return {
        name: 'Paystack Webhook', kind: 'payment',
        status, latencyMs: null, message, checkedAt,
        url: '/v1/webhooks/paystack',
        actions: ['recheck'],
        details: {
          succeeded24h: stats.last24h.succeeded,
          failed24h: stats.last24h.failed,
          revenue24h: `GH₵${stats.last24h.revenue}`,
          stuckIntents: stuck,
          eventsWithErrors24h: errored,
        },
      }
    } catch (err: any) {
      return {
        name: 'Paystack Webhook', kind: 'payment', status: 'down', latencyMs: null,
        message: err?.message?.slice(0, 200) ?? 'Stats unavailable',
        checkedAt, actions: ['recheck'],
      }
    }
  }

  private async checkPaystackReconciliation(): Promise<ServiceCheck> {
    const checkedAt = new Date().toISOString()
    try {
      const stats = await this.payments.getStats()
      const oldestMin = Math.round(stats.oldestPendingSeconds / 60)
      let status: ServiceStatus = 'healthy'
      let message = 'No pending intents'
      if (stats.stuckIntents === 0 && stats.oldestPendingSeconds === 0) {
        message = 'Nothing pending'
      } else if (oldestMin > 60) {
        status = 'down'
        message = `Oldest pending intent is ${oldestMin}min old — reconciler may be stuck`
      } else if (oldestMin > 15) {
        status = 'degraded'
        message = `${stats.stuckIntents} pending, oldest ${oldestMin}min`
      } else {
        message = `${stats.stuckIntents} pending, oldest ${oldestMin}min — within window`
      }
      return {
        name: 'Payment Reconciliation', kind: 'payment',
        status, latencyMs: null, message, checkedAt,
        actions: ['recheck'],
        details: {
          stuckIntents: stats.stuckIntents,
          oldestPendingMin: oldestMin,
          sweepIntervalMin: 5,
          ageThresholdMin: 10,
        },
      }
    } catch (err: any) {
      return {
        name: 'Payment Reconciliation', kind: 'payment', status: 'down', latencyMs: null,
        message: err?.message?.slice(0, 200) ?? 'Stats unavailable',
        checkedAt, actions: ['recheck'],
      }
    }
  }

  // ─── actions ────────────────────────────────────────────────────────────

  async reconnectDatabase(): Promise<ServiceCheck> {
    this.logger.warn('Service Quality: reconnecting Postgres pool')
    try {
      await this.db.reconnect()
    } catch (err: any) {
      this.logger.error(`Reconnect failed: ${err?.message}`)
    }
    return this.checkDatabase()
  }

  async recheck(name: string): Promise<ServiceCheck> {
    switch (name) {
      case 'PostgreSQL': return this.checkDatabase()
      case 'Schema':     return this.checkSchema()
      case 'API Server': return this.checkSelf()
      case 'Web App':    return (await this.checkHttp('Web App', process.env.WEB_URL))
        ?? { name, kind: 'http', status: 'down', latencyMs: null, message: 'WEB_URL not configured', checkedAt: new Date().toISOString() }
      case 'Storefront': return (await this.checkHttp('Storefront', process.env.STOREFRONT_URL))
        ?? { name, kind: 'http', status: 'down', latencyMs: null, message: 'STOREFRONT_URL not configured', checkedAt: new Date().toISOString() }
      case 'Clerk Auth': return this.checkClerk()
      case 'Paystack API':           return this.checkPaystackApi()
      case 'Paystack Webhook':       return this.checkPaystackWebhook()
      case 'Payment Reconciliation': return this.checkPaystackReconciliation()
      default:
        throw new BadRequestException(`Unknown service: ${name}`)
    }
  }

  forceGc(): { ran: boolean; before: number; after: number } {
    const before = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    if (typeof global.gc === 'function') {
      global.gc()
      const after = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      this.logger.log(`forceGc: freed ${before - after}MB`)
      return { ran: true, before, after }
    }
    return { ran: false, before, after: before }
  }

  /**
   * Restart a service.
   *  - Production with RAILWAY_API_TOKEN: triggers a Railway redeploy.
   *  - Local dev:
   *      api → touches apps/api/src/main.ts so `tsx watch` reloads
   *      web → touches apps/web/next.config.ts (limited; Next dev usually HMRs only on app code)
   */
  async restart(target: RestartTarget): Promise<{ ok: boolean; method: RestartMethod; message: string }> {
    const method = this.restartMethodFor(target)
    if (method === 'unsupported') {
      return {
        ok: false,
        method,
        message: target === 'web'
          ? 'Web restart requires RAILWAY_API_TOKEN + RAILWAY_WEB_SERVICE_ID (prod) or a supervisor (dev).'
          : 'API restart not supported in this environment.',
      }
    }

    if (method === 'railway') {
      return this.railwayRedeploy(target)
    }

    try {
      const file = target === 'api'
        ? this.resolveRepoPath('apps/api/src/main.ts')
        : this.resolveRepoPath('apps/web/next.config.ts')
      const now = new Date()
      await fs.utimes(file, now, now)
      return {
        ok: true,
        method,
        message: target === 'api'
          ? 'Touched apps/api/src/main.ts — tsx watch will reload'
          : 'Touched apps/web/next.config.ts — Next dev should pick up the change',
      }
    } catch (err: any) {
      return { ok: false, method, message: err?.message ?? 'Touch failed' }
    }
  }

  private async railwayRedeploy(target: RestartTarget): Promise<{ ok: boolean; method: RestartMethod; message: string }> {
    const serviceId = target === 'api'
      ? process.env.RAILWAY_API_SERVICE_ID
      : process.env.RAILWAY_WEB_SERVICE_ID
    const envId = process.env.RAILWAY_ENVIRONMENT_ID
    const token = process.env.RAILWAY_API_TOKEN
    if (!serviceId || !envId || !token) {
      return { ok: false, method: 'railway', message: 'Missing Railway env vars' }
    }
    try {
      const res = await fetch('https://backboard.railway.com/graphql/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          query: `mutation ($serviceId: String!, $environmentId: String!) {
            deploymentCreate(input: { serviceId: $serviceId, environmentId: $environmentId }) { id }
          }`,
          variables: { serviceId, environmentId: envId },
        }),
      })
      const data: any = await res.json()
      if (data?.errors?.length) {
        return { ok: false, method: 'railway', message: data.errors[0]?.message ?? 'Railway error' }
      }
      const id = data?.data?.deploymentCreate?.id
      return { ok: true, method: 'railway', message: id ? `Railway deploy queued: ${id}` : 'Railway deploy queued' }
    } catch (err: any) {
      return { ok: false, method: 'railway', message: err?.message ?? 'Railway request failed' }
    }
  }

  private restartMethodFor(target: RestartTarget): RestartMethod {
    if (process.env.RAILWAY_API_TOKEN && process.env.RAILWAY_ENVIRONMENT_ID) {
      const serviceId = target === 'api'
        ? process.env.RAILWAY_API_SERVICE_ID
        : process.env.RAILWAY_WEB_SERVICE_ID
      if (serviceId) return 'railway'
    }
    if (process.env.NODE_ENV === 'development') {
      return target === 'api' ? 'tsx-watch' : 'next-watch'
    }
    return 'unsupported'
  }

  /**
   * Read /tmp/trendx-supervisor.json written by scripts/dev-supervisor.sh.
   * Dev-only signal: lets the Service Quality page know whether `pnpm dev:safe`
   * is supervising the stack and surface restart counts / last crash time.
   */
  async getSupervisorState(): Promise<{
    present: boolean
    pid?: number
    status?: string
    restarts?: number
    lastStartUnix?: number
    lastEventUnix?: number
    lastExitCode?: number
    error?: string
  }> {
    try {
      const raw = await fs.readFile('/tmp/trendx-supervisor.json', 'utf8')
      const parsed = JSON.parse(raw)
      return { present: true, ...parsed }
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        return { present: false }
      }
      return { present: false, error: err?.message ?? 'read failed' }
    }
  }

  private resolveRepoPath(rel: string): string {
    // apps/api/src/health/health.service.ts → repo root is 4 levels up
    return path.resolve(__dirname, '../../../..', rel)
  }

  // ─── diagnostics (Tier 1: detect + suggest) ─────────────────────────────

  /**
   * Run the full health report and convert any non-healthy services + a
   * curated set of cross-cutting checks into actionable findings.
   *
   * Pure read-only. No remediation is performed (see TrendMarga-Plan.md →
   * "Tier 2: self-heal" gap for the planned follow-up).
   */
  async runDiagnostics(): Promise<DiagnosticsReport> {
    const t0 = Date.now()
    const report = await this.getReport()
    const findings: DiagnosticFinding[] = []

    // 1. Lift every non-healthy service into a finding.
    for (const svc of report.services) {
      if (svc.status === 'healthy') continue
      findings.push(this.serviceToFinding(svc))
    }

    // 2. Cross-cutting rules — fire even when services are "healthy".

    if (!process.env.WEB_URL) {
      findings.push({
        id: 'env-web-url-missing',
        service: 'Web App',
        severity: 'warning',
        title: 'WEB_URL not configured',
        message: 'API cannot probe the dashboard web app — no URL is set.',
        suggestion: 'Set WEB_URL in the API service env to the public dashboard origin (e.g. https://web-staging-d640.up.railway.app).',
        command: 'railway variables set WEB_URL=<https-origin>',
      })
    }
    if (!process.env.STOREFRONT_URL) {
      findings.push({
        id: 'env-storefront-url-missing',
        service: 'Storefront',
        severity: 'warning',
        title: 'STOREFRONT_URL not configured',
        message: 'API cannot probe the public storefront — no URL is set.',
        suggestion: 'Set STOREFRONT_URL in the API service env to the storefront origin.',
        command: 'railway variables set STOREFRONT_URL=<https-origin>',
      })
    }
    if (!process.env.CLERK_SECRET_KEY) {
      findings.push({
        id: 'env-clerk-secret-missing',
        service: 'Clerk Auth',
        severity: 'critical',
        title: 'CLERK_SECRET_KEY missing',
        message: 'Auth checks cannot run. Sign-in will fail in this environment.',
        suggestion: 'Add CLERK_SECRET_KEY to the API env (sk_test_ for dev, sk_live_ for prod).',
      })
    }

    // Memory / loop pressure (warning-level, captured even when "healthy").
    // Note: percent is heapUsed / v8 heap_size_limit — the real ceiling, not the
    // currently-committed heap. So this only fires when V8 has actually grown the
    // heap close to --max-old-space-size, which is a real leak/OOM risk.
    if (report.memoryMB.percent > 85) {
      const limit = report.memoryMB.limit ?? report.memoryMB.total
      findings.push({
        id: 'mem-heap-high',
        service: 'API Server',
        severity: report.memoryMB.percent > 95 ? 'critical' : 'warning',
        title: `Heap at ${report.memoryMB.percent}% of V8 limit`,
        message: `Heap ${report.memoryMB.used}/${limit}MB used · committed ${report.memoryMB.total}MB · RSS ${report.memoryMB.rssMB}MB.`,
        suggestion: 'Trigger a Force GC from the API Server card. If it stays high, look for a leak (unbounded caches, growing arrays, retained closures) or raise --max-old-space-size.',
      })
    }
    if (report.eventLoop.lagP99Ms > 250) {
      findings.push({
        id: 'loop-lag-high',
        service: 'API Server',
        severity: report.eventLoop.lagP99Ms > 1000 ? 'critical' : 'warning',
        title: `Event-loop p99 ${report.eventLoop.lagP99Ms}ms`,
        message: 'API is blocking — sustained lag will hurt request latency.',
        suggestion: 'Investigate sync work in hot paths; consider moving CPU-bound work to a BullMQ worker.',
      })
    }

    // Restart capability awareness — info, not a problem.
    if (
      process.env.NODE_ENV === 'production' &&
      report.capabilities.canRestartApi === 'unsupported'
    ) {
      findings.push({
        id: 'restart-not-wired',
        service: 'API Server',
        severity: 'info',
        title: 'Restart not wired in production',
        message: 'The dashboard cannot trigger a redeploy because Railway env vars are missing.',
        suggestion: 'Set RAILWAY_API_TOKEN, RAILWAY_ENVIRONMENT_ID, and RAILWAY_API_SERVICE_ID on the API service.',
      })
    }

    // Schema canary already produces a "Run: pnpm migrate:<env>" command in
    // its `details.fix`. Promote that into the finding when present.
    const schemaSvc = report.services.find(s => s.name === 'Schema')
    if (schemaSvc && schemaSvc.status === 'down' && typeof schemaSvc.details?.fix === 'string') {
      const idx = findings.findIndex(f => f.id === 'service-Schema')
      if (idx >= 0) {
        findings[idx] = {
          ...findings[idx],
          command: 'pnpm migrate:staging',
          docsHint: 'See README → "Database migrations on Railway".',
        }
      }
    }

    // Dedupe by id (last write wins).
    const dedup = new Map<string, DiagnosticFinding>()
    for (const f of findings) dedup.set(f.id, f)
    const finalFindings = [...dedup.values()].sort(this.compareFindings)

    const summary = {
      total: finalFindings.length,
      critical: finalFindings.filter(f => f.severity === 'critical').length,
      warning: finalFindings.filter(f => f.severity === 'warning').length,
      info: finalFindings.filter(f => f.severity === 'info').length,
      healthyServices: report.services.filter(s => s.status === 'healthy').length,
      totalServices: report.services.length,
    }

    return {
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - t0,
      overall: report.overall,
      summary,
      findings: finalFindings,
    }
  }

  private serviceToFinding(svc: ServiceCheck): DiagnosticFinding {
    const severity: FindingSeverity = svc.status === 'down' ? 'critical' : 'warning'
    const { title, suggestion, command, docsHint } = this.suggestionFor(svc)
    return {
      id: `service-${svc.name.replace(/\s+/g, '-')}`,
      service: svc.name,
      severity,
      title,
      message: svc.message,
      suggestion,
      ...(command ? { command } : {}),
      ...(docsHint ? { docsHint } : {}),
    }
  }

  private suggestionFor(svc: ServiceCheck): { title: string; suggestion: string; command?: string; docsHint?: string } {
    const down = svc.status === 'down'
    switch (svc.name) {
      case 'PostgreSQL':
        return {
          title: down ? 'Database is unreachable' : 'Database is slow',
          suggestion: down
            ? 'Confirm DATABASE_URL, check Postgres service status on Railway, then click Reconnect on the PostgreSQL card.'
            : 'Latency is above 500ms. Check Railway region pairing and current Postgres CPU.',
          docsHint: 'Memory: railway-monorepo → "pnpm + Railway".',
        }
      case 'Schema':
        return {
          title: down ? 'Migration drift detected' : 'Schema check degraded',
          suggestion: 'Apply pending Drizzle migrations against the target environment, then click Recheck.',
          command: 'pnpm migrate:staging',
          docsHint: 'See scripts/migrate-railway.sh.',
        }
      case 'API Server':
        return {
          title: down ? 'API server is unhealthy' : 'API server is degraded',
          suggestion: down
            ? 'Restart the API. If it keeps falling over, review recent deploys and the latest Railway logs.'
            : 'Try Force GC on the API Server card. If pressure remains after GC, restart.',
        }
      case 'Web App':
        return {
          title: down ? 'Web app is unreachable' : 'Web app is slow',
          suggestion: down
            ? 'Hit the URL in a browser. If it 500s, check the latest web deploy logs for a build/runtime error.'
            : 'Slow first response — usually cold start. Recheck in 30s.',
        }
      case 'Storefront':
        return {
          title: down ? 'Storefront is unreachable' : 'Storefront is slow',
          suggestion: down
            ? 'Verify STOREFRONT_URL and the storefront deploy status.'
            : 'Slow response from the storefront — likely cold start.',
        }
      case 'Clerk Auth':
        return {
          title: down ? 'Clerk auth is failing' : 'Clerk auth is slow',
          suggestion: down
            ? 'CLERK_SECRET_KEY may be invalid or Clerk is down. Verify the key in Clerk dashboard.'
            : 'Clerk JWKS is responding slowly. Usually transient.',
        }
      default:
        return {
          title: `${svc.name} ${down ? 'is down' : 'is degraded'}`,
          suggestion: 'Recheck the service; review logs if the issue persists.',
        }
    }
  }

  private compareFindings = (a: DiagnosticFinding, b: DiagnosticFinding): number => {
    const order: Record<FindingSeverity, number> = { critical: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  }
}
