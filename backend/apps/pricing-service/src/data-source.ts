import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PlatformRateAverage } from './rates/entities/platform-rate-average.entity';
import { CurrencyRate } from './currency/entities/currency-rate.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [PlatformRateAverage, CurrencyRate],
  migrations: ['apps/pricing-service/src/migrations/*.ts'],
  synchronize: false,
  ssl: (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
});
