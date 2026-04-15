import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import payload from 'payload';
import { CmsEventPublisher } from './rabbitmq/cms-event.publisher';

const app = express();
const PORT = Number(process.env.CMS_PORT) || 3020;

// Health check — registered before payload.init() so it's always available
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cms-service' });
});

// Readiness check — verifies DB + RabbitMQ
app.get('/ready', async (_req, res) => {
  const checks: Record<string, boolean> = { database: false, rabbitmq: false };

  try {
    // Use Payload local API for adapter-agnostic DB connectivity check
    await payload.find({ collection: 'users', limit: 0 });
    checks.database = true;
  } catch {
    checks.database = false;
  }

  checks.rabbitmq = CmsEventPublisher.getInstance()?.isConnected() ?? false;

  const allHealthy = Object.values(checks).every(Boolean);
  res.status(allHealthy ? 200 : 503).json({
    ready: allHealthy,
    checks,
  });
});

async function start() {
  const payloadSecret = process.env.PAYLOAD_SECRET;
  if (!payloadSecret) {
    throw new Error('PAYLOAD_SECRET environment variable is required');
  }

  // Initialize Payload CMS
  // REST API is always mounted. Admin panel requires `payload build` first.
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

  payload.logger.info(`About to start Express listener on port ${PORT}`);
  app.listen(PORT, () => {
    payload.logger.info(`cms-service running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start cms-service:', err);
  process.exit(1);
});
