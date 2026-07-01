// apps/offer-service/src/config/offer.config.ts
// OS-09: Typed config namespace, registered as 'offer'.
// OS-23: Added ably.environment and ably.tokenTtlSeconds.
// OS-29: Added integrations block for downstream service clients.
import { registerAs } from '@nestjs/config';

export const offerConfig = registerAs('offer', () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '', 10) || 3023,
    name: process.env.APP_NAME || 'offer-service',
    apiPrefix: process.env.API_PREFIX || 'v1',
    throttleTtl: parseInt(process.env.GLOBAL_THROTTLE_TTL || '', 10) || 60000,
    throttleLimit: parseInt(process.env.GLOBAL_THROTTLE_LIMIT || '', 10) || 100,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },

  db: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '', 10) || 5432,
    name: process.env.DATABASE_NAME || 'offer_db',
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: process.env.DATABASE_SSL_ENABLED === 'true',
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '', 10) || 10,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '', 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'offer-svc:',
    idempotencyTtl: parseInt(process.env.IDEMPOTENCY_TTL || '', 10) || 86400,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'marketeq.offers',
    exchangeType: process.env.RABBITMQ_EXCHANGE_TYPE || 'topic',
    prefetch: parseInt(process.env.RABBITMQ_PREFETCH || '', 10) || 10,
    durable: process.env.RABBITMQ_QUEUE_DURABLE !== 'false',
    reconnectDelay: parseInt(process.env.RABBITMQ_RECONNECT_DELAY || '', 10) || 5000,
  },

  ably: {
    apiKey: process.env.ABLY_API_KEY || '',
    channelPrefix: process.env.ABLY_CHANNEL_PREFIX || 'offer:',
    logLevel: parseInt(process.env.ABLY_LOG_LEVEL || '', 10) || 0,
    enabled: !!(process.env.ABLY_API_KEY && process.env.ABLY_API_KEY.length > 0),
    environment: process.env.ABLY_ENVIRONMENT || 'production',
    tokenTtlSeconds: parseInt(process.env.ABLY_TOKEN_TTL_SECONDS || '3600', 10),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'asdasdasd',
    jwtPublicKey: process.env.AUTH_JWT_PUBLIC_KEY || '',
    jwtAlgorithm: process.env.JWT_ALGORITHM || 'RS256',
  },

  services: {
    listingsUrl: process.env.LISTINGS_SERVICE_URL || 'http://localhost:3004',
    pricingUrl: process.env.PRICING_SERVICE_URL || 'http://localhost:3002',
    legalUrl: process.env.LEGAL_SERVICE_URL || 'http://localhost:3003',
    timeout: parseInt(process.env.INTERNAL_SERVICE_TIMEOUT || '', 10) || 5000,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN || 'change-me',
  },

  // OS-29: Downstream service integration configuration
  integrations: {
    listingsServiceUrl: process.env.LISTINGS_SERVICE_URL || 'http://localhost:3004',
    pricingServiceUrl: process.env.PRICING_SERVICE_URL || 'http://localhost:3002',
    legalServiceUrl: process.env.LEGAL_SERVICE_URL || 'http://localhost:3003',
    defaultTimeoutMs: parseInt(process.env.INTEGRATIONS_DEFAULT_TIMEOUT_MS || '3000', 10),
    listingsTimeoutMs: parseInt(process.env.LISTINGS_TIMEOUT_MS || '3000', 10),
    pricingTimeoutMs: parseInt(process.env.PRICING_TIMEOUT_MS || '1500', 10),
    legalTimeoutMs: parseInt(process.env.LEGAL_TIMEOUT_MS || '2000', 10),
    internalSecret: process.env.INTERNAL_SERVICE_SECRET || 'change-me',
  },

  scheduler: {
    expiryCron: process.env.EXPIRY_CRON || '* * * * *',
    warningCron: process.env.WARNING_CRON || '0 * * * *',
    outboxCron: process.env.OUTBOX_CRON || '*/10 * * * * *',
    enabled: process.env.SCHEDULER_ENABLED !== 'false',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'pretty',
    sentryDsn: process.env.SENTRY_DSN || undefined,
    sentryEnv: process.env.SENTRY_ENVIRONMENT || 'development',
    tracingEnabled: process.env.TRACING_ENABLED === 'true',
  },

  alert: {
    slackWebhookUrl: process.env.ALERT_SLACK_WEBHOOK_URL || undefined,
  },
}));

export type OfferConfig = ReturnType<typeof offerConfig>;