// apps/pricing-service/src/rates/seeds/pricing-service.seed.ts
//
// Run the seed script before executing any test cases.
// Flush Redis after seeding to ensure stale tests are not polluted by cached fresh results:
//   redis-cli -u $REDIS_URL keys "ps:*" | xargs redis-cli -u $REDIS_URL del

import { DataSource } from 'typeorm';
import { PlatformRateAverage } from '../entities/platform-rate-average.entity';

export async function seedPricingService(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(PlatformRateAverage);

  const conflictPaths = ['role', 'region', 'experienceLevel', 'schedule'];

  // ── Fresh records ────────────────────────────────────────────────────────────
  // Upsert so re-running the seed is safe — existing records are updated in place.
  await repo.upsert(
    [
      {
        role: 'UX Designer',
        region: 'United States',
        experienceLevel: 'mid',
        schedule: 'full_time',
        hourlyRateLowUsdCents: 7500,
        hourlyRateMedianUsdCents: 10000,
        hourlyRateHighUsdCents: 13500,
        sampleSize: 142,
      },
      {
        role: 'Backend Developer',
        region: 'Eastern Europe',
        experienceLevel: 'senior',
        schedule: 'full_time',
        hourlyRateLowUsdCents: 5000,
        hourlyRateMedianUsdCents: 7000,
        hourlyRateHighUsdCents: 9500,
        sampleSize: 98,
      },
      {
        role: 'Product Manager',
        region: 'Western Europe',
        experienceLevel: 'junior',
        schedule: 'part_time',
        hourlyRateLowUsdCents: 4000,
        hourlyRateMedianUsdCents: 5500,
        hourlyRateHighUsdCents: 7000,
        sampleSize: 31,
      },
    ],
    { conflictPaths },
  );

  // ── Stale record ─────────────────────────────────────────────────────────────
  // @UpdateDateColumn auto-sets last_updated to now() on save, so we cannot
  // pass a past timestamp directly. We upsert the record first, then patch it
  // with a raw UPDATE to simulate a record that was last refreshed 48 hours ago.
  // This is required by TC-RATE-07, TC-STALE-01, TC-STALE-02, TC-STALE-04.
  await repo.upsert(
    {
      role: 'DevOps Engineer',
      region: 'Southeast Asia',
      experienceLevel: 'mid',
      schedule: 'full_time',
      hourlyRateLowUsdCents: 3000,
      hourlyRateMedianUsdCents: 4500,
      hourlyRateHighUsdCents: 6000,
      sampleSize: 22,
    },
    { conflictPaths },
  );

  await dataSource.query(
    `UPDATE ps_platform_rate_averages
     SET last_updated = $1
     WHERE role = $2
       AND region = $3
       AND experience_level = $4
       AND schedule = $5`,
    [
      new Date(Date.now() - 48 * 3600 * 1000),
      'DevOps Engineer',
      'Southeast Asia',
      'mid',
      'full_time',
    ],
  );
}
