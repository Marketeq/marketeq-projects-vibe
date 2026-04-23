// apps/listings-service/src/seeds/run-homepage-listings-seed.ts
//
// Standalone seed runner for homepage listings fixtures.
// Run from the listings-service root:
//   npm run seed:homepage-listings
//
// Pre-condition: DATABASE_URL must be set in .env
//
// Uses raw SQL against listings.projects + listings.services, matching the
// CmsProjectsController pattern. Idempotent: re-runs are no-ops.

import 'reflect-metadata';
import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Env can live either in the listings-service dir (.env) or in the
// monorepo backend/.env. Load whichever exists, in priority order.
const candidateEnvPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(__dirname, '../../../../.env'),
];
for (const p of candidateEnvPaths) {
  if (existsSync(p)) {
    dotenvConfig({ path: p });
    break;
  }
}

import { DataSource } from 'typeorm';
import { seedHomepageListings } from './homepage-listings.seed';

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: false,
    synchronize: false,
    entities: [],
  });

  await dataSource.initialize();
  console.log('Database connected. Running homepage-listings seed...');

  await seedHomepageListings(dataSource);

  console.log('Seed complete.');
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
