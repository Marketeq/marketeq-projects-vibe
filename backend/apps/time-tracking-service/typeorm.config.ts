import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ActivityWatchEvent } from './src/entities/activity-watch-event.entity';
import { Screenshot } from './src/screenshots/screenshots.entity';
import { ManualTime } from './src/entities/manual-time.entity';
import { AdminSettings } from './src/entities/admin-settings.entity';
import { UserPreferences } from './src/entities/user-preferences.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgres://postgres:password@localhost:5432/marketeq',
  schema: 'time_tracking',
  entities: [ActivityWatchEvent, Screenshot, ManualTime, AdminSettings, UserPreferences],
  migrations: ['migrations/*.ts'],
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
});
