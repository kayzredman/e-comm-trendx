import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { WhatsappService } from './whatsapp.service'
import { ClerkGuard } from '../auth/clerk.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { z } from 'zod'

const pairSchema = z.object({
  phone: z.string().min(8).max(20),
})

const sendTestSchema = z.object({
  to: z.string().min(8),
  body: z.string().min(1).max(2000),
})

@Controller('whatsapp')
@UseGuards(ClerkGuard, RolesGuard)
@Roles('OWNER')
export class WhatsappController {
  constructor(private readonly wa: WhatsappService) {}

  @Get('status')
  status() {
    return this.wa.getStatus()
  }

  @Get('log')
  log() {
    return { entries: this.wa.getRecentLog() }
  }

  @Post('pair')
  async pair(@Body() body: unknown) {
    const { phone } = pairSchema.parse(body)
    return this.wa.startPairing(phone)
  }

  @Post('disconnect')
  async disconnect() {
    return this.wa.disconnect()
  }

  @Post('test')
  async test(@Body() body: unknown) {
    const { to, body: text } = sendTestSchema.parse(body)
    return this.wa.sendText(to, text)
  }
}
