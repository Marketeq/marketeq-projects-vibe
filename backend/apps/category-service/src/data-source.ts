import 'reflect-metadata';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

import { CategoryEntity } from './app/entities/category.entity';
import { TagEntity } from './app/entities/tag.entity';

const envPaths = [
  resolve(process.cwd(), 'apps/category-service/.env'),
  resolve(process.cwd(), '.env'),
];
const envPath = envPaths.find((candidate) => existsSync(candidate));
loadEnv(envPath ? { path: envPath } : undefined);

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',

  entities: [CategoryEntity, TagEntity],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',

  ssl:
    (process.env.NODE_ENV === 'production' ||
      process.env.DATABASE_SSL_ENABLED === 'true') &&
    process.env.DATABASE_SSL_ENABLED !== 'false'
      ? { rejectUnauthorized: false }
      : false,
});
