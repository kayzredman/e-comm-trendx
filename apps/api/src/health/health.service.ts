import { Injectable, Logger, BadRequestException, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { sql } from 'drizzle-orm'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks'

export type ServiceStatus = 'healthy' | 'degraded' | 'down'
export type ServiceKind = 'database' | 'self' | 'http' | 'auth'
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

export interface HealthReport {
  overall: ServiceStatus
  services: ServiceCheck[]
  serverUptimeSeconds: number
  memoryMB: { used: number; total: number; percent: number; rssMB: number; externalMB: number; arrayBuffersMB: number }
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

  constructor(private readonly db: DbService) {}

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
    const [dbCheck, apiCheck, webCheck, storefrontCheck, clerkCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkSelf(),
      this.checkHttp('Web App', process.env.WEB_URL),
      this.checkHttp('Storefront', process.env.STOREFRONT_URL),
      this.checkClerk(),
    ])

    const services = [dbCheck, apiCheck, webCheck, storefrontCheck, clerkCheck].filter(Boolean) as ServiceCheck[]

    const overall: ServiceStatus =
      services.some(s => s.status === 'down') ? 'down' :
      services.some(s => s.status === 'degraded') ? 'degraded' : 'healthy'

    const mem = process.memoryUsage()
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024)
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
        percent: totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0,
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
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024)
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024)
    const rssMB = Math.round(mem.rss / 1024 / 1024)
    const percent = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0
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
        ? `Memory ${percent}% \u00b7 loop p99 ${loop.lagP99Ms}ms`
        : `Heap ${usedMB}/${totalMB}MB \u00b7 RSS ${rssMB}MB \u00b7 loop ${loop.lagMeanMs}ms`,
      checkedAt: new Date().toISOString(),
      actions: ['restart', 'gc', 'recheck'],
      details: {
        version: this.apiVersion,
        node: process.version,
        platform: `${process.platform}/${process.arch}`,
        env: process.env.NODE_ENV ?? 'development',
        pid: process.pid,
        port: Number(process.env.API_PORT ?? 4000),
        heap: `${usedMB}/${totalMB}MB (${percent}%)`,
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
      case 'API Server': return this.checkSelf()
      case 'Web App':    return (await this.checkHttp('Web App', process.env.WEB_URL))
        ?? { name, kind: 'http', status: 'down', latencyMs: null, message: 'WEB_URL not configured', checkedAt: new Date().toISOString() }
      case 'Storefront': return (await this.checkHttp('Storefront', process.env.STOREFRONT_URL))
        ?? { name, kind: 'http', status: 'down', latencyMs: null, message: 'STOREFRONT_URL not configured', checkedAt: new Date().toISOString() }
      case 'Clerk Auth': return this.checkClerk()
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

  private resolveRepoPath(rel: string): string {
    // apps/api/src/health/health.service.ts → repo root is 4 levels up
    return path.resolve(__dirname, '../../../..', rel)
  }
}
