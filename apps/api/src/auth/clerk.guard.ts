import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createClerkClient, verifyToken } from '@clerk/backend'
import { FastifyRequest } from 'fastify'
import { IS_PUBLIC_KEY } from './public.decorator'

@Injectable()
export class ClerkGuard implements CanActivate {
  private clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY ?? '',
  })

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const token = this.extractToken(request)
    if (!token) throw new UnauthorizedException('Missing auth token')

    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY ?? '' })
      ;(request as any).user = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }

  private extractToken(req: FastifyRequest): string | null {
    const auth = req.headers.authorization
    if (auth?.startsWith('Bearer ')) return auth.slice(7)
    return null
  }
}
