import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { createClerkClient } from '@clerk/backend'
import { DbService } from '../db/db.service'
import { users } from '@trendmarga/db'
import { eq } from 'drizzle-orm'

export type UserRole = 'OWNER' | 'MANAGER' | 'CONTENT_EDITOR' | 'ORDER_MANAGER' | 'VIEWER' | 'STAFF'

@Injectable()
export class UsersService {
  private clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY ?? '' })

  constructor(private readonly db: DbService) {}

  // ── JIT sync: upsert user from Clerk JWT payload ──────────────────────────
  async syncUser(payload: { sub: string; email?: string; name?: string }) {
    const db = this.db.client

    // DB-first: skip Clerk API call for returning users (avoids latency on every page load)
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, payload.sub))
      .limit(1)

    if (existing.length > 0) {
      return existing[0]
    }

    // First-time only: fetch name/email from Clerk
    const clerkUser = await this.clerk.users.getUser(payload.sub)
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? payload.email ?? ''
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email

    // First-time: create as VIEWER (OWNER must be seeded separately)
    const [created] = await db
      .insert(users)
      .values({ clerkId: payload.sub, email, name, role: 'VIEWER' })
      .returning()

    return created
  }

  // ── Get current user with DB role ─────────────────────────────────────────
  async getMe(clerkId: string) {
    const db = this.db.client
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1)
    return user ?? null
  }

  // ── List all users ────────────────────────────────────────────────────────
  async listUsers() {
    return this.db.client.select().from(users).orderBy(users.createdAt)
  }

  // ── Invite user by email via Clerk ────────────────────────────────────────
  async inviteUser(email: string, role: UserRole, inviterName: string) {
    const db = this.db.client

    // Check if already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
      // Just update their role
      const [updated] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.email, email))
        .returning()
      return { type: 'updated', user: updated }
    }

    // Send Clerk invitation
    await this.clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:4002'}/cms/dashboard`,
    })

    // Pre-create user record with role (will be linked when they sign up via clerkId sync)
    const [created] = await db
      .insert(users)
      .values({ clerkId: `pending_${email}`, email, name: email, role })
      .returning()

    return { type: 'invited', user: created }
  }

  // ── Update role ───────────────────────────────────────────────────────────
  async updateRole(userId: string, role: UserRole, requestingUserId: string) {
    const db = this.db.client

    const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!target) throw new NotFoundException('User not found')

    // Prevent demoting the last OWNER
    if (target.role === 'OWNER' && role !== 'OWNER') {
      const owners = await db
        .select()
        .from(users)
        .where(eq(users.role, 'OWNER'))
      if (owners.length <= 1) {
        throw new ForbiddenException('Cannot remove the last OWNER')
      }
    }

    // Prevent self-demotion from OWNER
    const [requester] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, requestingUserId))
      .limit(1)
    if (requester?.id === userId && role !== 'OWNER') {
      throw new ForbiddenException('Cannot demote yourself')
    }

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    return updated
  }

  // ── Remove user ───────────────────────────────────────────────────────────
  async removeUser(userId: string) {
    const db = this.db.client

    const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!target) throw new NotFoundException('User not found')

    if (target.role === 'OWNER') {
      const owners = await db.select().from(users).where(eq(users.role, 'OWNER'))
      if (owners.length <= 1) throw new ForbiddenException('Cannot remove the last OWNER')
    }

    await db.delete(users).where(eq(users.id, userId))
    return { deleted: true }
  }
}
