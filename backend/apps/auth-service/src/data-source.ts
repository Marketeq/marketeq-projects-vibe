import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { config as loadEnv } from 'dotenv';

const envPaths = [
  resolve(process.cwd(), 'apps/auth-service/.env'),
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
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
});
