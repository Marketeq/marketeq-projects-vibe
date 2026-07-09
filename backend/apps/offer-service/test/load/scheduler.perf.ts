// apps/offer-service/test/load/scheduler.perf.ts
// OS-33: Measure ExpiryProcessor throughput on 10,000 expired offers.
// Acceptance threshold: 10,000 offers in under 60 seconds.
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { ExpiryProcessor } from '../../src/scheduler/expiry.processor';

const BATCH_SIZE = parseInt(process.env.PERF_BATCH ?? '10000', 10);
const THRESHOLD_MS = 60 * 1000;

async function runSchedulerPerfTest(): Promise<void> {
  console.log(`[Scheduler Perf] Testing expiry of ${BATCH_SIZE} offers.`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const ds = app.get<DataSource>(getDataSourceToken());
  const processor = app.get<ExpiryProcessor>(ExpiryProcessor);

  // Determine schema name
  const schema = process.env.NODE_ENV === 'test' ? 'offer_service_test' : 'offer_service';

  // Insert BATCH_SIZE expired PENDING offers in chunks of 500
  console.log('[Scheduler Perf] Inserting test offers...');
  const insertStart = Date.now();
  const chunkSize = 500;
  let inserted = 0;

  while (inserted < BATCH_SIZE) {
    const chunk = Math.min(chunkSize, BATCH_SIZE - inserted);
    const values = Array.from({ length: chunk }, (_, i) => {
      const idx = inserted + i;
      return `(
        '00000000-0000-4000-a000-${String(idx).padStart(12, '0')}',
        '10000000-0000-4000-a000-000000000001',
        '20000000-0000-4000-a000-000000000001',
        '30000000-0000-4000-a000-000000000001',
        'PROJECT', 'Perf Test ${idx}', 'PENDING', 95, 'USD', 6,
        '{"type":"FULL_TIME"}'::jsonb, '2099-01-01',
        NOW() - INTERVAL '1 minute', NOW(), NOW()
      )`;
    }).join(', ');

    await ds.query(`
      INSERT INTO ${schema}.offers
        (id, client_id, talent_id, job_listing_id, contract_type,
         contract_title, status, rate, currency_code, duration_months,
         work_schedule, start_date, expires_at, created_at, updated_at)
      VALUES ${values}
      ON CONFLICT (id) DO NOTHING
    `);
    inserted += chunk;
  }

  const insertMs = Date.now() - insertStart;
  console.log(`[Scheduler Perf] Inserted ${BATCH_SIZE} offers in ${insertMs}ms.`);

  // Measure: Run expiry processor until all offers are expired
  console.log('[Scheduler Perf] Running ExpiryProcessor...');
  const processStart = Date.now();
  let remaining = BATCH_SIZE;

  while (remaining > 0) {
    await processor.expireOffers();
    const [{ count }] = await ds.query(`
      SELECT COUNT(*) as count FROM ${schema}.offers
      WHERE status = 'PENDING' AND id LIKE '00000000-0000-4000-a000-%'
    `);
    remaining = parseInt(count, 10);
    if (remaining > 0) {
      process.stdout.write(`\r[Scheduler Perf] Remaining: ${remaining}    `);
    }
  }

  const processMs = Date.now() - processStart;
  const throughput = Math.round(BATCH_SIZE / (processMs / 1000));

  console.log(`\n\n[Scheduler Perf] Results:`);
  console.log(`  Offers expired:    ${BATCH_SIZE}`);
  console.log(`  Total time:        ${processMs}ms (${(processMs / 1000).toFixed(1)}s)`);
  console.log(`  Throughput:        ${throughput} offers/second`);

  if (processMs > THRESHOLD_MS) {
    console.error(
      `[FAIL] Exceeded threshold of ${THRESHOLD_MS}ms. Got ${processMs}ms.`,
    );
    await app.close();
    process.exit(1);
  }

  console.log('[PASS] Scheduler performance test passed.');
  await app.close();
}

runSchedulerPerfTest().catch((err) => {
  console.error(err);
  process.exit(1);
});