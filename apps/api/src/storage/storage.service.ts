import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { promises as fs } from 'fs'
import { createReadStream } from 'fs'
import * as path from 'path'
import { randomUUID, createHmac } from 'crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'

export interface PresignResult {
  /** URL the browser PUTs the raw bytes to. */
  uploadUrl: string
  /** Object key under which the file will be stored. */
  key: string
  /** Required headers the browser must send with the PUT. */
  headers: Record<string, string>
  /** Storage driver name (debug). */
  driver: 'r2' | 'local'
}

/**
 * Storage abstraction over an S3-compatible bucket (Cloudflare R2 in prod) and
 * a local-disk fallback for dev. The interface is intentionally tiny:
 *
 *   - `presignPut(...)`   → URL the browser uploads directly to
 *   - `putObject(...)`    → API writes a derivative (variant) to storage
 *   - `getObject(...)`    → API reads back the original for processing
 *   - `deleteObject(...)` → cleanup
 *   - `publicUrl(...)`    → URL to serve the variant to end users
 *
 * Driver selection is by presence of R2_* env vars (all four required for R2).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly driver: 'r2' | 'local'
  private readonly s3?: S3Client
  private readonly bucket?: string
  private readonly publicBase: string
  private readonly localRoot: string = ''
  /** Signing secret for local presign tokens (rotates on restart — dev only). */
  private readonly localSecret = randomUUID()

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKey = process.env.R2_ACCESS_KEY_ID
    const secretKey = process.env.R2_SECRET_ACCESS_KEY
    const bucket = process.env.R2_BUCKET
    const publicUrl = process.env.R2_PUBLIC_URL

    if (accountId && accessKey && secretKey && bucket && publicUrl) {
      this.driver = 'r2'
      this.bucket = bucket
      this.publicBase = publicUrl.replace(/\/$/, '')
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      })
      this.logger.log(`Storage: R2 bucket=${bucket}, public=${this.publicBase}`)
    } else {
      this.driver = 'local'
      this.localRoot = path.resolve(process.cwd(), 'uploads')
      const base =
        process.env.LOCAL_UPLOADS_BASE_URL?.replace(/\/$/, '') ??
        `http://localhost:${process.env.PORT ?? process.env.API_PORT ?? 4000}/uploads`
      this.publicBase = base
      this.logger.log(`Storage: LOCAL dir=${this.localRoot}, public=${this.publicBase}`)
    }
  }

  getDriver(): 'r2' | 'local' {
    return this.driver
  }

  /** Build the object key for a product image variant or original. */
  buildKey(productId: string, hash: string, name: string): string {
    return `products/${productId}/${hash}/${name}`
  }

  /** Public URL the browser uses to display the object. */
  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`
  }

  /**
   * Generate a one-shot upload target the browser can PUT raw bytes to.
   * Caller must provide a stable `key` (we use a temporary upload key like
   * `tmp/<uuid>` and rename to the content-addressed key after hashing).
   */
  async presignPut(key: string, contentType: string, contentLength?: number): Promise<PresignResult> {
    if (this.driver === 'r2') {
      const cmd = new PutObjectCommand({
        Bucket: this.bucket!,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
      })
      const uploadUrl = await getSignedUrl(this.s3!, cmd, { expiresIn: 300 })
      return {
        uploadUrl,
        key,
        headers: { 'Content-Type': contentType },
        driver: 'r2',
      }
    }

    // Local driver: sign a token the upload endpoint validates.
    const expires = Date.now() + 5 * 60 * 1000
    const token = this.signLocalToken(key, contentType, expires)
    const base = (process.env.LOCAL_UPLOADS_BASE_URL?.replace(/\/uploads$/, '') ??
      `http://localhost:${process.env.PORT ?? process.env.API_PORT ?? 4000}`).replace(/\/$/, '')
    const uploadUrl = `${base}/uploads/sign?key=${encodeURIComponent(key)}&exp=${expires}&token=${token}`
    return {
      uploadUrl,
      key,
      headers: { 'Content-Type': contentType },
      driver: 'local',
    }
  }

  signLocalToken(key: string, contentType: string, expires: number): string {
    return createHmac('sha256', this.localSecret).update(`${key}|${contentType}|${expires}`).digest('hex')
  }

  verifyLocalToken(key: string, contentType: string, expires: number, token: string): boolean {
    if (Date.now() > expires) return false
    const expected = this.signLocalToken(key, contentType, expires)
    if (expected.length !== token.length) return false
    // constant-time compare
    let diff = 0
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i)
    return diff === 0
  }

  /** Write bytes from the API (used to upload derivative variants). */
  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.driver === 'r2') {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.bucket!,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      )
      return
    }
    const full = path.join(this.localRoot, key)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, body)
  }

  /** Read object bytes (used in finalize to process the original). */
  async getObject(key: string): Promise<Buffer> {
    if (this.driver === 'r2') {
      const res = await this.s3!.send(new GetObjectCommand({ Bucket: this.bucket!, Key: key }))
      return await streamToBuffer(res.Body as Readable)
    }
    return fs.readFile(path.join(this.localRoot, key))
  }

  async deleteObject(key: string): Promise<void> {
    if (this.driver === 'r2') {
      try {
        await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket!, Key: key }))
      } catch (e: any) {
        this.logger.warn(`R2 delete failed for ${key}: ${e?.message ?? e}`)
      }
      return
    }
    try {
      await fs.unlink(path.join(this.localRoot, key))
    } catch (e: any) {
      if (e?.code !== 'ENOENT') this.logger.warn(`local delete failed for ${key}: ${e?.message ?? e}`)
    }
  }

  /** Local-only: open a readable stream for the static file endpoint. */
  readStream(key: string) {
    if (this.driver !== 'local') throw new InternalServerErrorException('readStream only valid for local driver')
    return createReadStream(path.join(this.localRoot, key))
  }

  /** Local-only: get absolute path on disk. */
  localPath(key: string): string {
    if (this.driver !== 'local') throw new InternalServerErrorException('localPath only valid for local driver')
    return path.join(this.localRoot, key)
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
  }
  return Buffer.concat(chunks)
}
