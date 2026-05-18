import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envPaths = [
  resolve(process.cwd(), 'apps/legal-service/.env'),
  resolve(__dirname, '..', '.env'),
  resolve(process.cwd(), '.env'),
];
const envPath = envPaths.find((p) => existsSync(p));
loadEnv(envPath ? { path: envPath } : undefined);

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  ssl: (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : false,
  migrationsTableName: 'ls_migrations', // uses ls_migrations to avoid conflicting with public.migrations (owned by other services)
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
