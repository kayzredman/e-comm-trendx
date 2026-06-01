import { Module } from '@nestjs/common'
import { CustomersService } from './customers.service'
import { CustomersController } from './customers.controller'
import { AccountController } from './account.controller'

@Module({
  controllers: [CustomersController, AccountController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
