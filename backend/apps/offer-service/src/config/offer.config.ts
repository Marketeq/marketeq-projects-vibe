// apps/offer-service/src/config/offer.config.ts
// OS-09: Typed config namespace, registered as 'offer'.
// OS-23: Added ably.environment and ably.tokenTtlSeconds.
// OS-29: Added integrations block for downstream service clients.
import { registerAs } from '@nestjs/config';

const envInt = (key: string, fallback: number): number =>
  parseInt(process.env[key] ?? String(fallback), 10) || fallback;

export const offerConfig = registerAs('offer', () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: envInt('PORT', 3025),
    name: process.env.APP_NAME || 'offer-service',
    apiPrefix: process.env.API_PREFIX || 'v1',
    throttleTtl: envInt('GLOBAL_THROTTLE_TTL', 60000),
    throttleLimit: envInt('GLOBAL_THROTTLE_LIMIT', 100),
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },

  db: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST,
    port: envInt('DATABASE_PORT', 5432),
    name: process.env.DATABASE_NAME || 'offer_db',
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: process.env.DATABASE_SSL_ENABLED === 'true',
    synchronize: false,
    maxConnections: envInt('DATABASE_MAX_CONNECTIONS', 10),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: envInt('REDIS_PORT', 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'offer-svc:',
    idempotencyTtl: envInt('IDEMPOTENCY_TTL', 86400),
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'marketeq.offers',
    exchangeType: process.env.RABBITMQ_EXCHANGE_TYPE || 'topic',
    prefetch: envInt('RABBITMQ_PREFETCH', 10),
    durable: process.env.RABBITMQ_QUEUE_DURABLE !== 'false',
    reconnectDelay: envInt('RABBITMQ_RECONNECT_DELAY', 5000),
  },

  ably: {
    apiKey: process.env.ABLY_API_KEY || '',
    channelPrefix: process.env.ABLY_CHANNEL_PREFIX || 'offer:',
    logLevel: envInt('ABLY_LOG_LEVEL', 0),
    enabled: !!(process.env.ABLY_API_KEY && process.env.ABLY_API_KEY.length > 0),
    environment: process.env.ABLY_ENVIRONMENT || 'production',
    tokenTtlSeconds: envInt('ABLY_TOKEN_TTL_SECONDS', 3600),
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
    timeout: envInt('INTERNAL_SERVICE_TIMEOUT', 5000),
    apiKey: process.env.INTERNAL_SERVICE_TOKEN || 'change-me',
  },

  // OS-29: Downstream service integration configuration
  integrations: {
    listingsServiceUrl: process.env.LISTINGS_SERVICE_URL || 'http://localhost:3004',
    pricingServiceUrl: process.env.PRICING_SERVICE_URL || 'http://localhost:3002',
    legalServiceUrl: process.env.LEGAL_SERVICE_URL || 'http://localhost:3003',
    defaultTimeoutMs: envInt('INTEGRATIONS_DEFAULT_TIMEOUT_MS', 3000),
    listingsTimeoutMs: envInt('LISTINGS_TIMEOUT_MS', 3000),
    pricingTimeoutMs: envInt('PRICING_TIMEOUT_MS', 1500),
    legalTimeoutMs: envInt('LEGAL_TIMEOUT_MS', 2000),
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
