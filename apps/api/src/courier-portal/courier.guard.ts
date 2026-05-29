import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { CourierAuthService } from './courier-auth.service'

@Injectable()
export class CourierGuard implements CanActivate {
  constructor(private readonly auth: CourierAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>()
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing courier token')
    const token = auth.slice(7)
    const courier = await this.auth.resolveToken(token)
    if (!courier) throw new UnauthorizedException('Invalid or expired session')
    ;(req as any).courier = courier
    ;(req as any).courierToken = token
    return true
  }
}
