// apps/offer-service/seeds/reset.ts
// OS-18: Wipes all offer-service data. Run before seed.ts for a clean slate.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';

const ALLOWED_ENVS = ['development', 'test', 'local'];
const NODE_ENV = process.env.NODE_ENV ?? 'development';

if (!ALLOWED_ENVS.includes(NODE_ENV)) {
  console.error(`[reset] ABORTED. NODE_ENV="${NODE_ENV}" is not allowed.`);
  process.exit(1);
}

async function reset(): Promise<void> {
  console.log('[reset] Resetting offer-service data...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const ds = app.get<DataSource>(getDataSourceToken());

  await ds.query(`DELETE FROM offer_service.outbox`);
  await ds.query(`DELETE FROM offer_service.offer_history`);
  await ds.query(`DELETE FROM offer_service.counter_offers`);
  await ds.query(`DELETE FROM offer_service.offers`);

  console.log('[reset] All offer_service data cleared.');
  await app.close();
}

reset().catch(err => { console.error('[reset] Error:', err); process.exit(1); });