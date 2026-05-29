import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { couriers, courierOtps, courierSessions } from '@trendmarga/db'
import { and, desc, eq, gt, isNull, inArray } from 'drizzle-orm'
import { createHash, randomBytes, randomInt } from 'crypto'
import { sendSms } from '../notifications/providers/hubtel.provider'

const OTP_TTL_MIN = 10
const SESSION_TTL_DAYS = 30
const MAX_ATTEMPTS = 5

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function normalisePhone(input: string): string {
  // Strip spaces / dashes; accept 0XXXXXXXXX or +233XXXXXXXXX, store +233 form.
  const digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('233')) return '+' + digits
  if (digits.startsWith('0')) return '+233' + digits.slice(1)
  return '+233' + digits
}

@Injectable()
export class CourierAuthService {
  private readonly logger = new Logger(CourierAuthService.name)

  constructor(private readonly db: DbService) {}

  /** Look up an active courier by phone. Throws if none / inactive. */
  private async findActiveCourier(phone: string) {
    // Couriers may have been stored in either +233XXX or 0XXX form; try both.
    const variants = [phone]
    if (phone.startsWith('+233')) variants.push('0' + phone.slice(4))
    const [c] = await this.db.client.select().from(couriers).where(inArray(couriers.phone, variants))
    if (!c) throw new UnauthorizedException('No courier account for that phone')
    if (!c.isActive) throw new UnauthorizedException('Account suspended — contact dispatch')
    return c
  }

  /** Generate + SMS a 6-digit code. Returns generic ack so we don't leak which phones are registered. */
  async requestOtp(rawPhone: string) {
    const phone = normalisePhone(rawPhone)
    const courier = await this.findActiveCourier(phone)

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000)

    await this.db.client.insert(courierOtps).values({
      phone,
      codeHash: hash(code),
      expiresAt,
    })

    const msg = `Your trendMarga courier code is ${code}. Expires in ${OTP_TTL_MIN} min. Do not share.`
    try {
      await sendSms(phone, msg)
    } catch (err) {
      this.logger.error(`Hubtel SMS failed for ${phone}: ${(err as Error).message}`)
    }

    return { ok: true, courierName: courier.name, expiresInMin: OTP_TTL_MIN }
  }

  /** Verify code, mint a session token. */
  async verifyOtp(rawPhone: string, code: string, userAgent?: string) {
    const phone = normalisePhone(rawPhone)
    const courier = await this.findActiveCourier(phone)

    const [otp] = await this.db.client.select().from(courierOtps)
      .where(and(
        eq(courierOtps.phone, phone),
        isNull(courierOtps.consumedAt),
        gt(courierOtps.expiresAt, new Date()),
      ))
      .orderBy(desc(courierOtps.createdAt))
      .limit(1)

    if (!otp) throw new BadRequestException('Code expired — request a new one')
    if (otp.attempts >= MAX_ATTEMPTS) throw new BadRequestException('Too many attempts')

    if (otp.codeHash !== hash(code)) {
      await this.db.client.update(courierOtps)
        .set({ attempts: otp.attempts + 1 })
        .where(eq(courierOtps.id, otp.id))
      throw new BadRequestException('Wrong code')
    }

    await this.db.client.update(courierOtps)
      .set({ consumedAt: new Date() })
      .where(eq(courierOtps.id, otp.id))

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60_000)

    await this.db.client.insert(courierSessions).values({
      courierId: courier.id,
      tokenHash: hash(token),
      userAgent: userAgent?.slice(0, 500) ?? null,
      expiresAt,
    })

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      courier: {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        vehicle: courier.vehicle,
        employmentType: courier.employmentType,
      },
    }
  }

  /** Resolve a token to a courier, bumping last_used_at. Returns null if invalid/expired. */
  async resolveToken(token: string) {
    const tokenHash = hash(token)
    const rows = await this.db.client
      .select({ s: courierSessions, c: couriers })
      .from(courierSessions)
      .leftJoin(couriers, eq(couriers.id, courierSessions.courierId))
      .where(eq(courierSessions.tokenHash, tokenHash))
      .limit(1)

    const row = rows[0]
    if (!row || !row.c) return null
    if (row.s.expiresAt < new Date()) return null
    if (!row.c.isActive) return null

    // Best-effort touch; don't block request on it
    void this.db.client.update(courierSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(courierSessions.id, row.s.id))
      .catch(() => {})

    return row.c
  }

  async signOut(token: string) {
    await this.db.client.delete(courierSessions).where(eq(courierSessions.tokenHash, hash(token)))
    return { ok: true }
  }
}
