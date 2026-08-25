// apps/offer-service/src/config/typeorm.config.ts
// OS-17: Standalone DataSource config for the TypeORM CLI.
// Used by: typeorm-ts-node-commonjs -d apps/offer-service/src/config/typeorm.config.ts
// NestJS uses TypeOrmModule.forRootAsync() in AppModule instead.
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? 'apps/offer-service/.env' });

const options: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'offer_db',
  schema: 'offer_service',
  ssl: process.env.DATABASE_SSL_ENABLED === 'true'
    ? { rejectUnauthorized: false }
    : false,
  synchronize: false,
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '../../migrations/*.{ts,js}')],
  migrationsTableName: 'migrations',
  logging: ['migration', 'error'],
};

export default options;
export const AppDataSource = new DataSource(options);