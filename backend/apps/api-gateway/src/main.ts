import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import { ApiGatewayModule } from './api-gateway.module'
import { GlobalExceptionFilter } from './filters/global-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule)
  const logger = new Logger('ApiGateway')

  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new GlobalExceptionFilter())
  const normalizeOrigin = (value: string) => value.trim().replace(/\/$/, '')
  const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)

  if (!allowedOrigins.includes('http://localhost:3000')) {
    allowedOrigins.push('http://localhost:3000')
  }

  if (allowedOrigins.length === 0) {
    throw new Error('FRONTEND_URL is not defined')
  }

  const vercelPreviewPattern = process.env.VERCEL_PREVIEW_ORIGIN_REGEX
    ? new RegExp(process.env.VERCEL_PREVIEW_ORIGIN_REGEX)
    : /^marketeq-projects(?:-[a-z0-9-]+)?-[a-z0-9-]+\.vercel\.app$/

  const isMarketeqVercelPreview = (origin: string) => {
    try {
      const url = new URL(origin)
      return url.protocol === 'https:' && vercelPreviewPattern.test(url.hostname)
    } catch {
      return false
    }
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)

      const normalizedOrigin = normalizeOrigin(origin)
      const allowed =
        allowedOrigins.includes(normalizedOrigin) ||
        isMarketeqVercelPreview(normalizedOrigin)

      if (allowed) return callback(null, true)

      logger.warn(`CORS blocked origin: ${origin}`)
      callback(null, false)
    },
    credentials: true,
  })

  const port = process.env.PORT || 4000
  await app.listen(port)
  logger.log(`api-gateway running on port ${port}`)
}
bootstrap()
