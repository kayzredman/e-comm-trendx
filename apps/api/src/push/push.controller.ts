import { Body, Controller, Delete, Get, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PushService, type PushPayload } from './push.service'
import { Public } from '../auth/public.decorator'

@ApiTags('push')
@Controller()
export class PushController {
  constructor(private readonly push: PushService) {}

  @Public()
  @Get('v1/push/vapid-key')
  vapidKey() {
    return this.push.getVapidPublicKey()
  }

  @Public()
  @Post('v1/push/subscribe')
  subscribe(@Body() body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }) {
    return this.push.subscribe({
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: body.userAgent ?? null,
    })
  }

  @Public()
  @Delete('v1/push/subscribe')
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.push.unsubscribe(body.endpoint)
  }

  // Admin-only test broadcast. Uses the standard Clerk-protected route — no
  // @Public, so AuthGuard requires a valid bearer token.
  @Post('cms/push/test')
  testBroadcast(@Body() body: PushPayload) {
    return this.push.broadcast({
      title: body?.title ?? 'trendMarga test',
      body: body?.body ?? 'This is a test push from CMS.',
      url: body?.url ?? '/',
      icon: body?.icon,
      badge: body?.badge,
      tag: body?.tag,
    })
  }
}
