import {
  All,
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common'
import { StorageService } from './storage.service'
import { Public } from '../auth/public.decorator'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { promises as fs } from 'fs'
import * as path from 'path'

/**
 * Local-driver-only upload endpoint. Acts as the "S3 presigned URL" for dev.
 *
 *   - `PUT /uploads/sign?key=...&exp=...&token=...`  → writes raw body to disk
 *   - `GET /uploads/<key>`                          → serves the stored object
 *
 * In production (R2 driver) these routes still mount, but PUT will reject
 * (we never hand out signed local URLs when R2 is configured).
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @All('sign')
  @Public()
  async signPut(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    if (req.method !== 'PUT') {
      return res.status(405).send({ statusCode: 405, message: 'Use PUT' })
    }
    if (this.storage.getDriver() !== 'local') {
      throw new UnauthorizedException('Local upload disabled when R2 is configured')
    }
    const q = req.query as Record<string, string | undefined>
    const key = q.key
    const exp = q.exp ? Number(q.exp) : 0
    const token = q.token
    const contentType = (req.headers['content-type'] as string) ?? 'application/octet-stream'
    if (!key || !exp || !token) throw new BadRequestException('Missing key/exp/token')
    if (!this.storage.verifyLocalToken(key, contentType, exp, token)) {
      throw new UnauthorizedException('Invalid or expired upload token')
    }
    const body = req.body
    if (!Buffer.isBuffer(body)) {
      throw new BadRequestException('PUT body must be a binary buffer')
    }
    await this.storage.putObject(key, body, contentType)
    return res.status(200).send({ ok: true, key })
  }

  @Get(':path(.*)')
  @Public()
  async serve(@Param('path') p: string, @Res() res: FastifyReply) {
    if (this.storage.getDriver() !== 'local') {
      throw new NotFoundException('Static uploads disabled when R2 is configured')
    }
    if (p.includes('..')) throw new BadRequestException('Bad path')
    try {
      const abs = this.storage.localPath(p)
      const data = await fs.readFile(abs)
      const ext = path.extname(p).toLowerCase()
      const type =
        ext === '.webp' ? 'image/webp' :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.png' ? 'image/png' :
        'application/octet-stream'
      res.header('Cache-Control', 'public, max-age=31536000, immutable')
      res.header('Content-Type', type)
      return res.send(data)
    } catch (e: any) {
      if (e?.code === 'ENOENT') throw new NotFoundException('Not found')
      throw new InternalServerErrorException(e?.message ?? 'read failed')
    }
  }
}
