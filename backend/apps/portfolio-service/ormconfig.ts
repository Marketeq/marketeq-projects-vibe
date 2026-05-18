import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['migrations/*.ts'],
  ssl: (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
});
