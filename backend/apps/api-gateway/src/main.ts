import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import * as cookieParser from 'cookie-parser'
import { json, urlencoded } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { ApiGatewayModule } from './api-gateway.module'
import { isRawBodyPath, captureRawBody } from './middleware/raw-body.middleware'
import { GlobalExceptionFilter } from './filters/global-exception.filter'

async function bootstrap() {
  // bodyParser: false — Nest's own hidden default body-parser would otherwise
  // run in addition to the explicit json()/raw-body-capture below, and for
  // /v1/webhooks/* it tries to read the request stream a second time after
  // the raw-body middleware has already fully drained it ("stream is not
  // readable"). main.ts already owns body parsing explicitly for every path.
  const app = await NestFactory.create(ApiGatewayModule, { bodyParser: false })
  const logger = new Logger('ApiGateway')

  // Stripe/Ramp/Didit webhook signature verification needs the
  // exact original request bytes — the global json() parser below re-parses
  // and would lose byte-for-byte fidelity with what the provider actually
  // signed. Capture the raw body here and skip json() entirely for these
  // paths; proxy.service.ts forwards req.rawBody untouched instead of the
  // (nonexistent, for this branch) parsed req.body.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isRawBodyPath(req)) return captureRawBody(req, res, next)
    // 10 MB required: desktop screenshot sync sends base64 JPEG payloads (~3-7 MB each)
    // via POST /api/screenshots/confirm. Reverting to 1 MB would break the DTT pipeline.
    json({ limit: '10mb' })(req, res, next)
  })
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isRawBodyPath(req)) return next()
    urlencoded({ limit: '10mb', extended: true })(req, res, next)
  })
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
    : /^(?:[a-z0-9-]+-)?marketeq-projects(?:-[a-z0-9-]+)?\.vercel\.app$/

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

    // Blog post synchronization from CMS
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'api-gateway.blogs',
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'cms.events.dlx',
          },
        },
        noAck: false,
        prefetchCount: 1,
        deserializer: cmsDeserializer,
      },
    })
    logger.log('RabbitMQ microservice connected (queue: api-gateway.blogs)')
  } else {
    logger.warn('RABBITMQ_URL not set — cms.events consumers disabled')
  }

  const port = process.env.PORT || 4000
  const host = process.env.HOST || '0.0.0.0'
  // Listen before starting the RMQ consumers, and don't wait for them.
  // startAllMicroservices() only resolves once every consumer has a broker
  // connection, and the RMQ transport retries forever. During a Render deploy
  // the old instance still holds most of the broker plan's 40 connections, so
  // awaiting it first meant the new gateway never answered /health and the
  // deploy failed (2026-10-23). The consumers keep retrying in the background
  // and attach once the old instance shuts down and frees its connections.
  await app.listen(port, host)
  logger.log(`api-gateway running on ${host}:${port}`)

  app.startAllMicroservices().catch((err: unknown) => {
    // Same redaction as shared/utils redactRabbitMqUrl(): a broker URL carries its password.
    const message = (err instanceof Error ? err.message : String(err)).replace(/(amqps?:\/\/)[^@\s/]+@/gi, '$1')
    logger.error(`cms.events consumers failed to start: ${message}`)
  })
}
bootstrap()
