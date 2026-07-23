import { registerAs } from '@nestjs/config';

export default registerAs('earnings', () => ({
  port: parseInt(process.env.PORT || '3026', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // Redis
  redisUrl: process.env.REDIS_URL,

  // RabbitMQ
  rabbitmqUrl: process.env.RABBITMQ_URL,

  // Auth
  jwtSecret: process.env.JWT_SECRET,
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN,

  // FX API (self-hosted fawazahmed0/exchange-api)
  fxApiUrl: process.env.FX_API_URL,
  fxCacheTtlSeconds: parseInt(process.env.FX_CACHE_TTL_SECONDS || '3600', 10),

  // ES-06: user-service lookup for the talent's preferred display currency
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',

  // Balance cache
  balanceCacheTtlSeconds:
    parseInt(process.env.BALANCE_CACHE_TTL_SECONDS || '300', 10),

  // Export
  exportMaxRowsSync: parseInt(process.env.EXPORT_MAX_ROWS_SYNC || '5000', 10),
  exportS3Bucket: process.env.EXPORT_S3_BUCKET,
  cloudflareR2Endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  cloudflareR2AccessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY,
  cloudflareR2SecretKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
}));