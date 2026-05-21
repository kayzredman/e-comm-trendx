import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Req,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ClerkGuard } from '../auth/clerk.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UsersService, type UserRole } from './users.service'
import type { FastifyRequest } from 'fastify'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Sync current user — ClerkGuard only, no RolesGuard (first-login JIT) ─
  @Post('sync')
  async sync(@Req() req: FastifyRequest) {
    const user = (req as any).user
    return this.usersService.syncUser({ sub: user.sub })
  }

  // ── Get current user's profile + role — ClerkGuard only ─────────────────
  @Get('me')
  async getMe(@Req() req: FastifyRequest) {
    const user = (req as any).user
    return this.usersService.getMe(user.sub)
  }

  // ── List all users (OWNER only) ──────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  listUsers() {
    return this.usersService.listUsers()
  }

  // ── Invite user by email (OWNER only) ───────────────────────────────────
  @Post('invite')
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  removeUser(@Param('id') id: string) {
    return this.usersService.removeUser(id)
  }
}
