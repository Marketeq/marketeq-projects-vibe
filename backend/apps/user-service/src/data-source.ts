import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { config as loadEnv } from 'dotenv';

const envPaths = [
  resolve(process.cwd(), 'apps/user-service/.env'),
  resolve(__dirname, '..', '.env'),
  resolve(process.cwd(), '.env'),
];
const envPath = envPaths.find((candidate) => existsSync(candidate));
loadEnv(envPath ? { path: envPath } : undefined);

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT
    ? parseInt(process.env.DATABASE_PORT, 10)
    : 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  // Match runtime TypeORM in app.module.ts. Without this, CLI migration
  // runs default to `public` and diverge from the live service schema.
  schema: 'user_service',
  // Keep migration state deterministic across environments.
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
});
