import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { discountCodes } from '@trendmarga/db'
import { and, eq, desc, gt, isNull, lt, or, sql } from 'drizzle-orm'

type UpsertDto = {
  id?: string
  code: string
  type: 'PERCENT' | 'FIXED'
  value: number
  minSubtotal?: number
  maxUses?: number | null
  expiresAt?: Date | string | null
  isActive?: boolean
  isPromoted?: boolean
  promoLabel?: string | null
}

@Injectable()
export class DiscountsService {
  constructor(private readonly db: DbService) {}

  list() {
    return this.db.client.query.discountCodes.findMany({
      orderBy: [desc(discountCodes.createdAt)],
    })
  }

  /**
   * Public listing of currently-redeemable promoted codes. Filters out
   * inactive, expired, and exhausted codes so the storefront never advertises
   * a code the user couldn't actually apply.
   */
  async listPromoted() {
    const rows = await this.db.client
      .select()
      .from(discountCodes)
      .where(
        and(
          eq(discountCodes.isPromoted, true),
          eq(discountCodes.isActive, true),
          or(
            isNull(discountCodes.expiresAt),
            gt(discountCodes.expiresAt, new Date()),
          ),
        ),
      )
      .orderBy(desc(discountCodes.createdAt))
    return rows.filter(r => r.maxUses == null || r.usedCount < r.maxUses)
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
      isPromoted: dto.isPromoted ?? false,
      promoLabel: dto.promoLabel?.trim() ? dto.promoLabel.trim() : null,
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

  /**
   * Atomic redeem: validate + increment usedCount in a single UPDATE guarded
   * by `used_count < max_uses` when a quota is set. Returns { code, discount }
   * on success; throws on quota race or other validation failures.
   *
   * Use this from order placement instead of validate() + markUsed() to avoid
   * over-issuing under concurrent checkouts.
   */
  async redeem(code: string, subtotal: number) {
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
    if (subtotal < Number(row.minSubtotal)) {
      throw new BadRequestException(`Minimum subtotal of ${row.minSubtotal} not met`)
    }

    const value = Number(row.value)
    const discount = row.type === 'PERCENT'
      ? Math.round(subtotal * (value / 100) * 100) / 100
      : Math.min(value, subtotal)

    const updated = await this.db.client
      .update(discountCodes)
      .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
      .where(
        and(
          eq(discountCodes.id, row.id),
          row.maxUses === null
            ? undefined
            : lt(discountCodes.usedCount, row.maxUses),
        ),
      )
      .returning()

    if (updated.length === 0) {
      throw new ConflictException('Code fully used')
    }

    return { code: updated[0], discount }
  }

  /** Compensating decrement when an order fails after redeem succeeded. */
  async refundRedeem(id: string) {
    await this.db.client
      .update(discountCodes)
      .set({ usedCount: sql`GREATEST(${discountCodes.usedCount} - 1, 0)` })
      .where(eq(discountCodes.id, id))
  }
}
