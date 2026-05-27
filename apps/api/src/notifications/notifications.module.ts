import { Module, Global } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { DbModule } from '../db/db.module'

@Global()
@Module({
  imports: [DbModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
