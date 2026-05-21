import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from './roles.decorator'
import { DbService } from '../db/db.service'
import { users } from '@trendmarga/db'
import { eq } from 'drizzle-orm'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly db: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No @Roles decorator → OWNER only by default
    if (!requiredRoles || requiredRoles.length === 0) {
      requiredRoles?.push('OWNER')
    }

    const request = context.switchToHttp().getRequest()
    const clerkPayload = request.user
    if (!clerkPayload?.sub) throw new ForbiddenException('No user identity')

    // Look up DB role
    const [dbUser] = await this.db.client
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkPayload.sub))
      .limit(1)

    if (!dbUser) throw new ForbiddenException('User not found in system. Contact the administrator.')

    // Attach DB user to request for downstream use
    request.dbUser = dbUser

    if (requiredRoles && !requiredRoles.includes(dbUser.role)) {
      throw new ForbiddenException(`Requires one of: ${requiredRoles.join(', ')}`)
    }

    return true
  }
}
