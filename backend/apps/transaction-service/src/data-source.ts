import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envPaths = [
  resolve(process.cwd(), 'apps/transaction-service/.env'),
  resolve(__dirname, '..', '.env'),
  resolve(process.cwd(), '.env'),
];
const envPath = envPaths.find((p) => existsSync(p));
loadEnv(envPath ? { path: envPath } : undefined);

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: 'transaction_service',
  synchronize: false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
