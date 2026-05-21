import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { sql } from 'drizzle-orm'

export type ServiceStatus = 'healthy' | 'degraded' | 'down'

export interface ServiceCheck {
  name: string
  status: ServiceStatus
  latencyMs: number | null
  message: string
  checkedAt: string
}

export interface HealthReport {
  overall: ServiceStatus
  services: ServiceCheck[]
  serverUptimeSeconds: number
  memoryMB: { used: number; total: number; percent: number }
  checkedAt: string
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now()

  constructor(private readonly db: DbService) {}

  async getReport(): Promise<HealthReport> {
    const [dbCheck, apiCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkSelf(),
    ])

    const services = [dbCheck, apiCheck]

    const overall: ServiceStatus =
      services.some(s => s.status === 'down') ? 'down' :
      services.some(s => s.status === 'degraded') ? 'degraded' : 'healthy'

    const mem = process.memoryUsage()
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024)
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024)

    return {
      overall,
      services,
      serverUptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      memoryMB: { used: usedMB, total: totalMB, percent: Math.round((usedMB / totalMB) * 100) },
      checkedAt: new Date().toISOString(),
    }
  }

  private async checkDatabase(): Promise<ServiceCheck> {
    const t0 = Date.now()
    try {
      await this.db.client.execute(sql`SELECT 1`)
      const latencyMs = Date.now() - t0
      return {
        name: 'PostgreSQL',
        status: latencyMs > 500 ? 'degraded' : 'healthy',
        latencyMs,
        message: latencyMs > 500 ? `High latency: ${latencyMs}ms` : 'Connected and responsive',
        checkedAt: new Date().toISOString(),
      }
    } catch (err: any) {
      return {
        name: 'PostgreSQL',
        status: 'down',
        latencyMs: null,
        message: err?.message ?? 'Connection failed',
        checkedAt: new Date().toISOString(),
      }
    }
  }

  private async checkSelf(): Promise<ServiceCheck> {
    const mem = process.memoryUsage()
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024)
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024)
    const percent = Math.round((usedMB / totalMB) * 100)
    return {
      name: 'API Server',
      status: percent > 90 ? 'degraded' : 'healthy',
      latencyMs: 0,
      message: percent > 90
        ? `Memory pressure: ${usedMB}MB / ${totalMB}MB`
        : `Memory: ${usedMB}MB / ${totalMB}MB (${percent}%)`,
      checkedAt: new Date().toISOString(),
    }
  }
}
