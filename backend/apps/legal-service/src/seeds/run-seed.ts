/**
 * Seed runner for legal-service.
 *
 * Usage (from backend/ directory):
 *   node dist/apps/legal-service/seeds/run-seed.js
 *
 * Requires DATABASE_URL env var (loaded from apps/legal-service/.env automatically).
 */
import { AppDataSource } from '../data-source';
import { seedLegalService } from './legal-service.seed';

async function main(): Promise<void> {
  console.log('🌱 Connecting to database...');
  await AppDataSource.initialize();
  console.log('🌱 Running legal-service seed...\n');

  await seedLegalService(AppDataSource);

  await AppDataSource.destroy();
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
