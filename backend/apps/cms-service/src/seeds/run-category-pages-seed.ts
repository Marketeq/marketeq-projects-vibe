import payload from 'payload';
import dotenv from 'dotenv';

import { seedCategoryPages } from './category-pages.seed';

dotenv.config();

async function run(): Promise<void> {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || 'dev-secret',
    local: true,
  });

  const rabbitmqUrl = process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    const { CmsEventPublisher } = require('../rabbitmq/cms-event.publisher');
    const publisher = CmsEventPublisher.getInstance();
    await publisher.connect(rabbitmqUrl);
    payload.logger.info('RabbitMQ connected — category-page.saved events will sync to category-service');
  } else {
    payload.logger.warn('RABBITMQ_URL not set — seed will populate CMS DB only, no category-service sync');
  }

  await seedCategoryPages(payload);
  payload.logger.info('✅ Category pages seeded');

  // Give in-flight publishes time to flush before process exits
  await new Promise((r) => setTimeout(r, 2000));
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
