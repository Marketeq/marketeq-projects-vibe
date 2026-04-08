import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import payload from 'payload';
import { CmsEventPublisher } from './rabbitmq/cms-event.publisher';

const app = express();
const PORT = Number(process.env.CMS_PORT) || 3020;
const IS_PROD = process.env.NODE_ENV === 'production';

// Health check — registered before payload.init() so it's always available
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cms-service' });
});

// Readiness check — verifies DB + RabbitMQ with cached status
let lastHealthCheck = { database: false, rabbitmq: false, checkedAt: 0 };
const HEALTH_CACHE_TTL_MS = 5000;

app.get('/ready', async (_req, res) => {
  const now = Date.now();
  if (now - lastHealthCheck.checkedAt < HEALTH_CACHE_TTL_MS) {
    const allHealthy = lastHealthCheck.database && lastHealthCheck.rabbitmq;
    const body = IS_PROD ? { ready: allHealthy } : { ready: allHealthy, checks: lastHealthCheck };
    return res.status(allHealthy ? 200 : 503).json(body);
  }

  const checks = { database: false, rabbitmq: false, checkedAt: now };

  try {
    await payload.find({ collection: 'users', limit: 0 });
    checks.database = true;
  } catch {
    checks.database = false;
  }

  checks.rabbitmq = CmsEventPublisher.getInstance()?.isConnected() ?? false;
  lastHealthCheck = checks;

  const allHealthy = checks.database && checks.rabbitmq;
  const body = IS_PROD ? { ready: allHealthy } : { ready: allHealthy, checks };
  res.status(allHealthy ? 200 : 503).json(body);
});

async function start() {
  // Validate critical env vars
  const payloadSecret = process.env.PAYLOAD_SECRET;
  if (!payloadSecret) {
    throw new Error('PAYLOAD_SECRET environment variable is required');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (IS_PROD && (!process.env.CMS_SERVER_URL || process.env.CMS_SERVER_URL.includes('localhost'))) {
    throw new Error('CMS_SERVER_URL must be set to a non-localhost URL in production');
  }

  // Initialize Payload CMS
  await payload.init({
    secret: payloadSecret,
    express: app,
    onInit: async () => {
      payload.logger.info('Payload CMS initialized');
      payload.logger.info(`Collections: ${payload.collections ? Object.keys(payload.collections).join(', ') : 'none'}`);
    },
  });

  // Connect RabbitMQ publisher (non-blocking)
  const rabbitmqUrl = process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    try {
      const publisher = CmsEventPublisher.getInstance();
      await publisher.connect(rabbitmqUrl);
      payload.logger.info('RabbitMQ publisher connected');
    } catch (err) {
      payload.logger.error({ err }, 'RabbitMQ connection failed — events will not publish');
    }
  } else {
    payload.logger.warn('RABBITMQ_URL not set — category sync events disabled');
  }

  const server = app.listen(PORT, () => {
    payload.logger.info(`cms-service running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    payload.logger.info('Shutting down cms-service...');
    server.close(async () => {
      try {
        await CmsEventPublisher.getInstance().close();
      } catch { /* ignore */ }
      process.exit(0);
    });
    // Force exit after 10s if server doesn't close
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start cms-service:', err);
  process.exit(1);
});
