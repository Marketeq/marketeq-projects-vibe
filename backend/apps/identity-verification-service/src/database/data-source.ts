import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { config as loadEnv } from 'dotenv';

const envPaths = [
  resolve(process.cwd(), 'apps/identity-verification-service/.env'),
  resolve(__dirname, '..', '..', '.env'),
  resolve(process.cwd(), '.env'),
];
const envPath = envPaths.find((candidate) => existsSync(candidate));
loadEnv(envPath ? { path: envPath } : undefined);

export const identityVerificationDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: 'identity_verification',
  entities: [path.join(__dirname, '..', 'entities', '*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
};

const dataSource = new DataSource(identityVerificationDataSourceOptions);
export default dataSource;
