// apps/listings-service/src/job-listing/seeds/run-seed.ts
//
// Standalone seed runner for QA test data.
// Run from the listings-service root:
//   npm run seed:job-listing
//
// Pre-condition: DATABASE_URL must be set in .env

import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { JobListing } from '../entities/job-listing.entity';
import { JobListingPhase } from '../entities/job-listing-phase.entity';
import { JobListingTask } from '../entities/job-listing-task.entity';
import { TeamMemberRow } from '../entities/job-listing-role-row.entity';
import { RoleDescription } from '../entities/job-listing-role-description.entity';
import { BasicInformation } from '../entities/job-listing-basic-info.entity';
import { seedJobListings } from './job-listing.seed';

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: false,
    synchronize: false,
    entities: [
      JobListing,
      JobListingPhase,
      JobListingTask,
      TeamMemberRow,
      RoleDescription,
      BasicInformation,
    ],
  });

  await dataSource.initialize();
  console.log('Database connected. Running job-listing seed...');

  await seedJobListings(dataSource);

  console.log('Seed complete.');
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
