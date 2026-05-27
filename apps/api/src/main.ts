import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { validateEnv } from '@trendmarga/config'

async function bootstrap() {
  const env = validateEnv()

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: env.NODE_ENV === 'development' }),
  )

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // CORS — allow web app origin(s)
  const allowedOrigins = [
    ...(process.env.WEB_URL ? [process.env.WEB_URL] : []),
  ]
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-side fetches)
      if (!origin) return callback(null, true)
      // Allow any localhost port in dev
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true)
      // Allow any *.up.railway.app subdomain (staging / prod previews)
      if (allowedOrigins.includes(origin) || /^https:\/\/[^.]+\.up\.railway\.app$/.test(origin)) {
        return callback(null, true)
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`), false)
    },
    credentials: true,
  })

  // Swagger (dev only)
  if (env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('trendMarga API')
      .setDescription('trendMarga REST API — Phase 1')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const doc = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('docs', app, doc)
  }

  // Railway injects PORT; fallback to API_PORT for local dev
  const port = parseInt(process.env.PORT ?? String(env.API_PORT))
  await app.listen(port, '0.0.0.0')
  console.log(`🚀 API running on port ${port}`)
}

bootstrap()
