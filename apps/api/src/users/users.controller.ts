import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Req, ForbiddenException,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ClerkGuard } from '../auth/clerk.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UsersService, type UserRole } from './users.service'
import type { FastifyRequest } from 'fastify'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(ClerkGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Sync current user (called on dashboard load) ────────────────────────
  @Post('sync')
  @Roles('OWNER', 'MANAGER', 'CONTENT_EDITOR', 'ORDER_MANAGER', 'VIEWER', 'STAFF')
  async sync(@Req() req: FastifyRequest) {
    const user = (req as any).user
    return this.usersService.syncUser({ sub: user.sub, email: user.email })
  }

  // ── Get current user's profile + role ───────────────────────────────────
  @Get('me')
  @Roles('OWNER', 'MANAGER', 'CONTENT_EDITOR', 'ORDER_MANAGER', 'VIEWER', 'STAFF')
  async getMe(@Req() req: FastifyRequest) {
    const user = (req as any).user
    return this.usersService.getMe(user.sub)
  }

  // ── List all users (OWNER only) ──────────────────────────────────────────
  @Get()
  @Roles('OWNER')
  listUsers() {
    return this.usersService.listUsers()
  }

  // ── Invite user by email (OWNER only) ───────────────────────────────────
  @Post('invite')
  @Roles('OWNER')
  async invite(
    @Body() body: { email: string; role: UserRole },
    @Req() req: FastifyRequest,
  ) {
    const requester = (req as any).dbUser
    return this.usersService.inviteUser(body.email, body.role, requester?.name ?? 'Admin')
  }

  // ── Update role (OWNER only) ─────────────────────────────────────────────
  @Patch(':id/role')
  @Roles('OWNER')
  updateRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
    @Req() req: FastifyRequest,
  ) {
    const clerkId = (req as any).user.sub
    return this.usersService.updateRole(id, body.role, clerkId)
  }

  // ── Remove user (OWNER only) ─────────────────────────────────────────────
  @Delete(':id')
  @Roles('OWNER')
  removeUser(@Param('id') id: string) {
    return this.usersService.removeUser(id)
  }
}
