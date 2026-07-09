// Standalone DataSource for TypeORM CLI.
// Usage: npx typeorm migration:run -d apps/payout-service/src/data-source.ts
import { DataSource } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? 'apps/payout-service/.env' });
dotenv.config(); // fallback to root .env

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl:
    (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : false,
  entities: [join(__dirname, '**/*.entity.{ts,js}')],
  migrations: [join(__dirname, 'database/migrations/*.{ts,js}')],
  synchronize: false,
  logging: ['migration', 'error'],
});
