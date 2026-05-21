import { Module } from '@nestjs/common'
import { ClerkGuard } from './clerk.guard'
import { RolesGuard } from './roles.guard'
import { DbModule } from '../db/db.module'

@Module({
  imports: [DbModule],
  providers: [ClerkGuard, RolesGuard],
  exports: [ClerkGuard, RolesGuard],
})
export class AuthModule {}
