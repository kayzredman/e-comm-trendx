import { Module } from '@nestjs/common'
import { DiscountsService } from './discounts.service'
import { DiscountsController } from './discounts.controller'
import { DbModule } from '../db/db.module'

@Module({
  imports: [DbModule],
  controllers: [DiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
