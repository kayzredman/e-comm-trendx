import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { z } from 'zod'
import type { FastifyRequest } from 'fastify'
import { CustomersService } from './customers.service'
import { ClerkGuard } from '../auth/clerk.guard'

const bootstrapSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(5),
  address: z
    .object({
      street: z.string().default(''),
      city: z.string().default(''),
      region: z.string().default(''),
      country: z.string().default('GH'),
      zip: z.string().nullable().default(null),
    })
    .optional(),
})

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(5).optional(),
})

const addressSchema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  region: z.string().min(1),
  country: z.string().min(1).default('GH'),
  zip: z.string().nullable().default(null),
  isDefault: z.boolean().optional(),
})

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('v1/account')
export class AccountController {
  constructor(private readonly customers: CustomersService) {}

  private clerkId(req: FastifyRequest): string {
    const user = (req as any).user as { sub?: string } | undefined
    const sub = user?.sub
    if (!sub) throw new UnauthorizedException('Missing Clerk subject')
    return sub
  }

  @Get('me')
  async me(@Req() req: FastifyRequest) {
    const clerkId = this.clerkId(req)
    return (await this.customers.findByClerkId(clerkId)) ?? null
  }

  @Post('bootstrap')
  async bootstrap(@Req() req: FastifyRequest, @Body() body: unknown) {
    const clerkId = this.clerkId(req)
    const parsed = bootstrapSchema.parse(body)
    return this.customers.bootstrapForClerkUser(clerkId, parsed)
  }

  @Patch('me')
  async update(@Req() req: FastifyRequest, @Body() body: unknown) {
    const clerkId = this.clerkId(req)
    const customer = await this.customers.findByClerkId(clerkId)
    if (!customer) throw new UnauthorizedException('No customer profile')
    const parsed = profileSchema.parse(body)
    return this.customers.updateProfile(customer.id, parsed)
  }

  @Get('orders')
  async orders(@Req() req: FastifyRequest) {
    const clerkId = this.clerkId(req)
    const customer = await this.customers.findByClerkId(clerkId)
    if (!customer) return []
    return this.customers.listMyOrders(customer.id)
  }

  @Get('addresses')
  async listAddresses(@Req() req: FastifyRequest) {
    const clerkId = this.clerkId(req)
    const customer = await this.customers.findByClerkId(clerkId)
    if (!customer) return []
    return this.customers.listAddresses(customer.id)
  }

  @Post('addresses')
  async addAddress(@Req() req: FastifyRequest, @Body() body: unknown) {
    const clerkId = this.clerkId(req)
    const customer = await this.customers.findByClerkId(clerkId)
    if (!customer) throw new UnauthorizedException('No customer profile')
    const parsed = addressSchema.parse(body)
    return this.customers.addAddress(customer.id, parsed)
  }

  @Patch('addresses/:id')
  async patchAddress(@Req() req: FastifyRequest, @Param('id') id: string, @Body() body: unknown) {
    const clerkId = this.clerkId(req)
    const customer = await this.customers.findByClerkId(clerkId)
    if (!customer) throw new UnauthorizedException('No customer profile')
    const parsed = addressSchema.partial().parse(body)
    return this.customers.updateAddress(customer.id, id, parsed)
  }

  @Delete('addresses/:id')
  async removeAddress(@Req() req: FastifyRequest, @Param('id') id: string) {
    const clerkId = this.clerkId(req)
    const customer = await this.customers.findByClerkId(clerkId)
    if (!customer) throw new UnauthorizedException('No customer profile')
    return this.customers.removeAddress(customer.id, id)
  }
}
