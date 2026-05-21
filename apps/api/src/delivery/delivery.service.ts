import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { deliveryZones, deliverySettings } from '@trendmarga/db'
import { eq } from 'drizzle-orm'

@Injectable()
export class DeliveryService {
  constructor(private readonly db: DbService) {}

  getZones() {
    return this.db.client.query.deliveryZones.findMany({
      where: eq(deliveryZones.isActive, true),
    })
  }

  getAllZones() {
    return this.db.client.query.deliveryZones.findMany()
  }

  async calculateFee(zoneId: string, orderTotal: number, distanceKm?: number): Promise<number> {
    const zone = await this.db.client.query.deliveryZones.findFirst({
      where: eq(deliveryZones.id, zoneId),
    })
    if (!zone) return 0

    const base = Number(zone.baseFee)
    const freeThreshold = zone.freeThreshold ? Number(zone.freeThreshold) : null
    const feePerKm = zone.feePerKm ? Number(zone.feePerKm) : 0

    switch (zone.feeStrategy) {
      case 'FREE_THRESHOLD':
        return freeThreshold && orderTotal >= freeThreshold ? 0 : base
      case 'DISTANCE_BASED':
        return base + (distanceKm ?? 0) * feePerKm
      case 'COMBINED':
        if (freeThreshold && orderTotal >= freeThreshold) return 0
        return base + (distanceKm ?? 0) * feePerKm
      case 'FLAT':
      default:
        return base
    }
  }

  async upsertZone(data: typeof deliveryZones.$inferInsert) {
    if (data.id) {
      const [z] = await this.db.client.update(deliveryZones).set(data).where(eq(deliveryZones.id, data.id)).returning()
      return z
    }
    const [z] = await this.db.client.insert(deliveryZones).values(data).returning()
    return z
  }
}
