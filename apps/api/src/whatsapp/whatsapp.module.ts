import { Global, Module } from '@nestjs/common'
import { WhatsappService } from './whatsapp.service'
import { WhatsappInboundService } from './whatsapp-inbound.service'
import { WhatsappController } from './whatsapp.controller'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'

@Global()
@Module({
  imports: [DbModule, AuthModule],
  providers: [WhatsappService, WhatsappInboundService],
  controllers: [WhatsappController],
  exports: [WhatsappService],
})
export class WhatsappModule {}
