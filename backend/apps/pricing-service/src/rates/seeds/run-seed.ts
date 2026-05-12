// apps/pricing-service/src/rates/seeds/run-seed.ts
// Run with: npx ts-node -r dotenv/config apps/pricing-service/src/rates/seeds/run-seed.ts dotenv_config_path=apps/pricing-service/.env

import 'reflect-metadata';
import { AppDataSource } from '../../data-source';
import { seedPricingService } from './pricing-service.seed';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Database connected. Running seed...');

  await seedPricingService(AppDataSource);
  console.log('Seed complete.');

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
