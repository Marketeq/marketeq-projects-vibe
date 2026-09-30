import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import * as cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { json, urlencoded } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { ApiGatewayModule } from './api-gateway.module'
import { GlobalExceptionFilter } from './filters/global-exception.filter'
import { RateLimitService } from './rate-limit/rate-limit.service'
import { createPreAuthRateLimit } from './rate-limit/rate-limit.middleware'

async function bootstrap() {
  // bodyParser: false — Nest's own hidden default body-parser would otherwise
  // run in addition to the explicit json()/raw-body-capture below, and for
  // /v1/webhooks/* it tries to read the request stream a second time after
  // the raw-body middleware has already fully drained it ("stream is not
  // readable"). main.ts already owns body parsing explicitly for every path.
  const app = await NestFactory.create(ApiGatewayModule, { bodyParser: false })
  const logger = new Logger('ApiGateway')

  // Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
  // at the single public entry point for all external traffic. Matches the
  // bare helmet() defaults already used in portfolio-service and
  // time-tracking-service; kept before body-parsing/CORS so headers are set
  // on every response, including error responses from the global filter.
  app.use(helmet())

  // CORS before everything below it: a 429 from the rate limiter (or any
  // other early rejection) must carry the CORS headers, or a browser reports
  // it as a CORS failure instead of showing the real status to the user.
  const normalizeOrigin = (value: string) => value.trim().replace(/\/$/, '')
  const isProd = process.env.NODE_ENV === 'production'
  const allowLocalhostOrigin =
    (process.env.ALLOW_LOCALHOST_ORIGIN || '').toLowerCase() === 'true'
  const isLocalhostOrigin = (value: string) => {
    try {
      const { hostname } = new URL(value)
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    } catch {
      return false
    }
  }

  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)

  if (configuredOrigins.length === 0) {
    throw new Error('FRONTEND_URL is not defined')
  }

  // A localhost origin trusted in production means a page running on a
  // victim's own machine can read authenticated responses from live data
  // (requests carry cookies: credentials are on). FRONTEND_URL carries one
  // today, and localhost:3000 also used to be appended unconditionally, in
  // every environment. Both are dropped in production now; local development
  // is expected to run against a local backend (see README), and
  // ALLOW_LOCALHOST_ORIGIN=true restores it for a deliberate, temporary case.
  const allowedOrigins =
    isProd && !allowLocalhostOrigin
      ? configuredOrigins.filter((o) => !isLocalhostOrigin(o))
      : [...new Set([...configuredOrigins, 'http://localhost:3000'])]

  if (isProd && allowedOrigins.length !== configuredOrigins.length) {
    logger.warn(
      'Dropped localhost origin(s) from the production CORS allow-list; ' +
        'remove them from FRONTEND_URL, or set ALLOW_LOCALHOST_ORIGIN=true to keep them',
    )
  }

  if (allowedOrigins.length === 0) {
    throw new Error('FRONTEND_URL contains no usable origins')
  }

  const vercelPreviewPattern = process.env.VERCEL_PREVIEW_ORIGIN_REGEX
    ? new RegExp(process.env.VERCEL_PREVIEW_ORIGIN_REGEX)
    : /^(?:[a-z0-9-]+-)?marketeq-projects(?:-[a-z0-9-]+)?\.vercel\.app$/

  // vercel.app is a shared domain: anyone can deploy a project whose hostname
  // matches this pattern, and a matching origin is allowed to read
  // authenticated responses. Preview access stays on by default so preview
  // deployments keep working, but every match in production is logged (once)
  // so the real users of it can be identified and listed explicitly in
  // FRONTEND_URL — after which set CORS_ALLOW_VERCEL_PREVIEWS=false.
  const allowVercelPreviews =
    (process.env.CORS_ALLOW_VERCEL_PREVIEWS || 'true').toLowerCase() !== 'false'
  let warnedPreviewOrigin = false

  const isMarketeqVercelPreview = (origin: string) => {
    if (!allowVercelPreviews) return false
    try {
      const url = new URL(origin)
      const matched = url.protocol === 'https:' && vercelPreviewPattern.test(url.hostname)
      if (matched && isProd && !warnedPreviewOrigin) {
        warnedPreviewOrigin = true
        logger.warn(
          `CORS allowed a Vercel preview origin in production by pattern: ${origin} — ` +
            'list real preview origins in FRONTEND_URL and set CORS_ALLOW_VERCEL_PREVIEWS=false',
        )
      }
      return matched
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

  // Per-IP rate limiting runs here, ahead of body parsing, so a flood is
  // counted and turned away before the gateway spends anything on it. It also
  // closes a gap found in testing: a request with a malformed JSON body fails
  // inside express's json() parser, so when the limiter ran later (as module
  // middleware) those requests were never counted at all and an attacker could
  // flood with broken payloads unseen. Per-user limits stay in
  // PostAuthRateLimitMiddleware, which needs the verified token from
  // JwtMiddleware.
  app.use(createPreAuthRateLimit(app.get(RateLimitService)))

  // Stripe/Ramp webhook signature verification (in payout-service) needs the
  // exact original request bytes — the global json() parser below re-parses
  // and would lose byte-for-byte fidelity with what the provider actually
  // signed. Capture the raw body here and skip json() entirely for these
  // paths; proxy.service.ts forwards req.rawBody untouched instead of the
  // (nonexistent, for this branch) parsed req.body.
  const isWebhookPath = (req: Request) =>
    req.originalUrl.startsWith('/v1/webhooks') || req.originalUrl.startsWith('/api/v1/webhooks')

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isWebhookPath(req)) {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        ;(req as any).rawBody = Buffer.concat(chunks)
        // body-parser skips any request already flagged as parsed. Without
        // this, a webhook posted as application/x-www-form-urlencoded would
        // reach urlencoded() below, which then tries to read a stream this
        // middleware has already drained — the body arrives empty and the
        // provider signature check fails with no useful error.
        ;(req as any)._body = true
        next()
      })
      return
    }
    // 10 MB required: desktop screenshot sync sends base64 JPEG payloads (~3-7 MB each)
    // via POST /api/screenshots/confirm. Reverting to 1 MB would break the DTT pipeline.
    json({ limit: '10mb' })(req, res, next)
  })
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isWebhookPath(req)) return next()
    urlencoded({ limit: '10mb', extended: true })(req, res, next)
  })
  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new GlobalExceptionFilter())

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

  await app.startAllMicroservices()

  const port = process.env.PORT || 4000
  const host = process.env.HOST || '0.0.0.0'
  await app.listen(port, host)
  logger.log(`api-gateway running on ${host}:${port}`)
}
bootstrap()
