import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { deliveryEvents } from '@trendmarga/db'
import { desc, eq } from 'drizzle-orm'

type EventType = typeof deliveryEvents.$inferInsert['type']

@Injectable()
export class DeliveryEventsService {
  constructor(private readonly db: DbService) {}

  record(input: {
    orderId: string
    type: EventType
    actorId?: string | null
    actorName?: string | null
    courierId?: string | null
    note?: string | null
  }) {
    return this.db.client.insert(deliveryEvents).values({
      orderId: input.orderId,
      type: input.type,
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      courierId: input.courierId ?? null,
      note: input.note ?? null,
    }).returning()
  }

  listForOrder(orderId: string) {
    return this.db.client.select().from(deliveryEvents)
      .where(eq(deliveryEvents.orderId, orderId))
      .orderBy(desc(deliveryEvents.createdAt))
  }
}
