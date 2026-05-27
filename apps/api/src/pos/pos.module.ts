import { Module } from '@nestjs/common'
import { PosController } from './pos.controller'
import { PosService } from './pos.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
