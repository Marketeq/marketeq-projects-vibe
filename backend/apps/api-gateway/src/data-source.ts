import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Migration tooling only: the running gateway configures TypeORM in
// api-gateway.module.ts and never imports this file. Without it, the boot
// drift report could only say "ships compiled migrations but exposes no
// data-source", and the gateway's tables (homepages, homepage_banners,
// blog_posts) had no way to be created.
const envPaths = [
  resolve(process.cwd(), 'apps/api-gateway/.env'),
  resolve(__dirname, '..', '.env'),
  resolve(process.cwd(), '.env'),
];
const envPath = envPaths.find((p) => existsSync(p));
loadEnv(envPath ? { path: envPath } : undefined);

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // api-gateway.module.ts sets no schema, so the gateway runs in public.
  schema: process.env.DATABASE_SCHEMA || 'public',
  // Its own bookkeeping table: public.migrations is already shared by 15
  // services, which makes their applied-counts and pending lists unreliable.
  migrationsTableName: 'api_gateway_migrations',
  synchronize: false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
