import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envPaths = [
  resolve(process.cwd(), 'apps/notification-service/.env'),
  resolve(__dirname, '..', '.env'),
  resolve(process.cwd(), '.env'),
];
const envPath = envPaths.find((p) => existsSync(p));
loadEnv(envPath ? { path: envPath } : undefined);

const rawSsl = String(
  process.env.DATABASE_SSL ?? process.env.DATABASE_SSL_ENABLED ?? '',
).toLowerCase();
const useSsl = rawSsl === 'true';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // Must match the runtime default in notification-service.module.ts, which is
  // 'public'. This defaulted to 'notifications' while the running service read
  // 'public', and DATABASE_SCHEMA is not set in any deployed environment — so
  // the migration runner and the service pointed at two different schemas.
  // The practical effect on staging: the `notifications` schema was empty while
  // every live row sat in public, the drift report measured this service against
  // an empty `notifications.migrations` and reported 4 permanently-pending
  // migrations, and an apply would have built a complete but empty copy in
  // `notifications`, left the live table untouched, and then reported success.
  schema: process.env.DATABASE_SCHEMA || 'public',
  synchronize: false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
