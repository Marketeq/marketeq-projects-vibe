// apps/offer-service/src/config/validation.schema.ts
// OS-09: Joi validation schema for all offer-service environment variables.
// OS-23: Added ABLY_ENVIRONMENT, ABLY_TOKEN_TTL_SECONDS.
// OS-29: Added integration timeout vars.
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // ---- Application ----
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1024).max(65535).default(3023),
  APP_NAME: Joi.string().default('offer-service'),
  API_PREFIX: Joi.string().default('v1'),
  GLOBAL_THROTTLE_TTL: Joi.number().integer().min(1000).default(60000),
  GLOBAL_THROTTLE_LIMIT: Joi.number().integer().min(1).default(100),

  // ---- PostgreSQL ----
  DATABASE_URL: Joi.string().required(),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().integer().default(5432),
  DATABASE_NAME: Joi.string().default('offer_db'),
  DATABASE_USERNAME: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string().allow('').default(''),
  DATABASE_SSL_ENABLED: Joi.boolean().default(false),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false).when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.valid(false).messages({
      'any.only': 'DATABASE_SYNCHRONIZE must be false in staging/production. Use migrations.',
    }),
  }),
  DATABASE_MAX_CONNECTIONS: Joi.number().integer().min(1).max(100).default(10),

  // ---- Redis ----
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().integer().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_KEY_PREFIX: Joi.string().default('offer-svc:'),
  IDEMPOTENCY_TTL: Joi.number().integer().min(60).default(86400),

  // ---- RabbitMQ ----
  RABBITMQ_URL: Joi.string()
    .uri({ scheme: ['amqp', 'amqps'] })
    .default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: Joi.string().default('marketeq.offers'),
  RABBITMQ_EXCHANGE_TYPE: Joi.string()
    .valid('direct', 'topic', 'fanout', 'headers')
    .default('topic'),
  RABBITMQ_PREFETCH: Joi.number().integer().min(1).default(10),
  RABBITMQ_QUEUE_DURABLE: Joi.boolean().default(true),
  RABBITMQ_RECONNECT_DELAY: Joi.number().integer().min(100).default(5000),

  // ---- Ably (optional in dev — stubbed when empty) ----
  ABLY_API_KEY: Joi.string().allow('').default(''),
  ABLY_CHANNEL_PREFIX: Joi.string().default('offer:'),
  ABLY_LOG_LEVEL: Joi.number().integer().min(0).max(4).default(0),
  ABLY_ENVIRONMENT: Joi.string().default('production'),
  ABLY_TOKEN_TTL_SECONDS: Joi.number().integer().min(60).max(86400).default(3600),

  // ---- Auth / JWT (RS256 — platform standard via @libs/auth) ----
  AUTH_JWT_PUBLIC_KEY: Joi.string().allow('').default(''),
  JWT_SECRET: Joi.string().default('asdasdasd'),
  JWT_ALGORITHM: Joi.string().valid('HS256', 'RS256', 'RS384', 'RS512').default('RS256'),

  // ---- Internal Service URLs ----
  LISTINGS_SERVICE_URL: Joi.string().uri().default('http://localhost:3004'),
  PRICING_SERVICE_URL: Joi.string().uri().default('http://localhost:3002'),
  LEGAL_SERVICE_URL: Joi.string().uri().default('http://localhost:3003'),
  INTERNAL_SERVICE_TIMEOUT: Joi.number().integer().min(500).max(30000).default(5000),
  INTERNAL_SERVICE_TOKEN: Joi.string().default('change-me'),

  // OS-29: Integration timeout configuration
  INTEGRATIONS_DEFAULT_TIMEOUT_MS: Joi.number().integer().min(500).max(30000).default(3000),
  LISTINGS_TIMEOUT_MS: Joi.number().integer().min(500).max(10000).default(3000),
  PRICING_TIMEOUT_MS: Joi.number().integer().min(500).max(10000).default(1500),
  LEGAL_TIMEOUT_MS: Joi.number().integer().min(500).max(10000).default(2000),
  INTERNAL_SERVICE_SECRET: Joi.string().default('change-me'),

  // ---- Scheduler ----
  EXPIRY_CRON: Joi.string().default('* * * * *'),
  WARNING_CRON: Joi.string().default('0 * * * *'),
  OUTBOX_CRON: Joi.string().default('*/10 * * * * *'),
  SCHEDULER_ENABLED: Joi.boolean().default(true),

  // ---- Logging & Monitoring ----
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('pretty'),
  SENTRY_DSN: Joi.string().uri().allow('').optional(),
  SENTRY_ENVIRONMENT: Joi.string().default('development'),
  TRACING_ENABLED: Joi.boolean().default(false),
});