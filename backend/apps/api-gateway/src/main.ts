import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import * as cookieParser from 'cookie-parser'
import { json, urlencoded } from 'express'
import { ApiGatewayModule } from './api-gateway.module'
import { GlobalExceptionFilter } from './filters/global-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule)
  const logger = new Logger('ApiGateway')

  app.use(json({ limit: '1mb' }))
  app.use(urlencoded({ limit: '1mb', extended: true }))
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

  // RMQ consumers for cms.events fan-out — one connectMicroservice call per
  // queue (NestJS Transport.RMQ binds 1:1 with the queue). cms-service
  // publishes raw `{ event, ...fields }` payloads via amqp-connection-manager;
  // the deserializer lifts `event` into NestJS's `pattern` slot so
  // @EventPattern handlers fire (same fix as user-service / category-service).
  const rabbitmqUrl = process.env.RABBITMQ_URL
  const cmsDeserializer = {
    deserialize: (value: unknown) => {
      const v = (value ?? {}) as { event?: string }
      return { pattern: v.event, data: value }
    },
  }
  if (rabbitmqUrl) {
    // Homepage cache invalidation on homepage.saved / homepage.deleted
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'api-gateway.homepage',
        queueOptions: {
          durable: true,
          arguments: { 'x-dead-letter-exchange': 'cms.events.dlx' },
        },
        noAck: false,
        prefetchCount: 1,
        deserializer: cmsDeserializer,
      },
    })
    logger.log('RabbitMQ microservice connected (queue: api-gateway.homepage)')

    // Project edits also invalidate the /homepage cache because the feed
    // embeds project cards (homepage.service.fetchProjects). Without this
    // consumer, project changes stay invisible on `/` until cache TTL.
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'api-gateway.projects',
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'cms.events.dlx',
            'x-message-ttl': 30000,
          },
        },
        noAck: false,
        prefetchCount: 1,
        deserializer: cmsDeserializer,
      },
    })
    logger.log('RabbitMQ microservice connected (queue: api-gateway.projects)')
  } else {
    logger.warn('RABBITMQ_URL not set — cms.events consumers disabled')
  }

  await app.startAllMicroservices()

  const port = process.env.PORT || 4000
  await app.listen(port)
  logger.log(`api-gateway running on port ${port}`)
}
bootstrap()
