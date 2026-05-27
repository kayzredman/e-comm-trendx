import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { discountCodes } from '@trendmarga/db'
import { eq, desc, sql } from 'drizzle-orm'

type UpsertDto = {
  id?: string
  code: string
  type: 'PERCENT' | 'FIXED'
  value: number
  minSubtotal?: number
  maxUses?: number | null
  expiresAt?: Date | string | null
  isActive?: boolean
}

@Injectable()
export class DiscountsService {
  constructor(private readonly db: DbService) {}

  list() {
    return this.db.client.query.discountCodes.findMany({
      orderBy: [desc(discountCodes.createdAt)],
    })
  }

  async upsert(dto: UpsertDto) {
    const payload = {
      code: dto.code.trim().toUpperCase(),
      type: dto.type,
      value: String(dto.value),
      minSubtotal: String(dto.minSubtotal ?? 0),
      maxUses: dto.maxUses ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: dto.isActive ?? true,
    }
    if (dto.id) {
      const [d] = await this.db.client
        .update(discountCodes)
        .set(payload)
        .where(eq(discountCodes.id, dto.id))
        .returning()
      return d
    }
    const [d] = await this.db.client.insert(discountCodes).values(payload).returning()
    return d
  }

  async remove(id: string) {
    await this.db.client.delete(discountCodes).where(eq(discountCodes.id, id))
  }

  /**
   * Validate a code against a cart subtotal.
   * Returns the computed discount amount (in currency units) and the code row.
   * Throws BadRequestException if the code is invalid / expired / over-quota.
   * Does NOT increment usage — callers must call `markUsed` after successful order.
   */
  async validate(code: string, subtotal: number) {
    const normalized = code.trim().toUpperCase()
    const [row] = await this.db.client
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, normalized))
      .limit(1)

    if (!row) throw new NotFoundException('Invalid code')
    if (!row.isActive) throw new BadRequestException('Code disabled')
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      throw new BadRequestException('Code expired')
    }
    if (row.maxUses != null && row.usedCount >= row.maxUses) {
      throw new BadRequestException('Code fully used')
    }
    if (subtotal < Number(row.minSubtotal)) {
      throw new BadRequestException(`Minimum subtotal of ${row.minSubtotal} not met`)
    }

    const value = Number(row.value)
    const discount = row.type === 'PERCENT'
      ? Math.round(subtotal * (value / 100) * 100) / 100
      : Math.min(value, subtotal)

    return { code: row, discount }
  }

  async markUsed(id: string) {
    await this.db.client
      .update(discountCodes)
      .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
      .where(eq(discountCodes.id, id))
  }
}
