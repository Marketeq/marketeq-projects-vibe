import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envPaths = [
  resolve(process.cwd(), 'apps/favorites-service/.env'),
  resolve(__dirname, '..', '.env'),
  resolve(process.cwd(), '.env'),
];
const envPath = envPaths.find((p) => existsSync(p));
loadEnv(envPath ? { path: envPath } : undefined);

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // Must match the runtime, which is 'public': app.module.ts sets no schema and
  // DATABASE_SCHEMA is not set in any deployed environment. This defaulted to
  // 'favorites', an empty schema, so the drift report measured the service
  // against an empty favorites.migrations (10 permanently-pending migrations)
  // and an apply would have built a full, empty copy there while the live
  // public.favorites / public.favorite_groups stayed untouched. Same trap
  // notification-service had (#606).
  schema: process.env.DATABASE_SCHEMA || 'public',
  synchronize: false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
