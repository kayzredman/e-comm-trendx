import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CustomersService } from './customers.service'
import { ClerkGuard } from '../auth/clerk.guard'

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll() { return this.customersService.findAll() }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.customersService.findOne(id) }
}
