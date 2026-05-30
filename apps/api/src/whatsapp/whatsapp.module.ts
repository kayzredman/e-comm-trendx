import { Global, Module } from '@nestjs/common'
import { WhatsappService } from './whatsapp.service'
import { WhatsappController } from './whatsapp.controller'
import { DbModule } from '../db/db.module'
import { AuthModule } from '../auth/auth.module'

@Global()
@Module({
  imports: [DbModule, AuthModule],
  providers: [WhatsappService],
  controllers: [WhatsappController],
  exports: [WhatsappService],
})
export class WhatsappModule {}
