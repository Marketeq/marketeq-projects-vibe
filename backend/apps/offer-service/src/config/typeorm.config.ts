// apps/offer-service/src/config/typeorm.config.ts
// OS-17: Standalone DataSource config for the TypeORM CLI.
// Used by: typeorm-ts-node-commonjs -d apps/offer-service/src/config/typeorm.config.ts
// NestJS uses TypeOrmModule.forRootAsync() in AppModule instead.
import { DataSource, DataSourceOptions } from 'typeorm';
import { LoggerOptions } from 'typeorm/logger/LoggerOptions';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? 'apps/offer-service/.env' });

const logging: LoggerOptions = ['migration', 'error'];

const shared = {
  type: 'postgres' as const,
  schema: 'offer_service',
  ssl:
    process.env.DATABASE_SSL_ENABLED === 'true'
      ? { rejectUnauthorized: false }
      : false,
  synchronize: false,
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '../../migrations/*.{ts,js}')],
  migrationsTableName: 'migrations',
  logging,
};

// Prefer DATABASE_URL so the CLI targets the same database as the running
// service (AppModule connects via cfg.db.url). Without this the CLI silently
// fell back to a database named "offer_db" that does not exist in local dev,
// so the offer_service schema was never created.
const options: DataSourceOptions = process.env.DATABASE_URL
  ? { ...shared, url: process.env.DATABASE_URL }
  : {
      ...shared,
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.DATABASE_USERNAME ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'offer_db',
    };

export default options;
export const AppDataSource = new DataSource(options);
