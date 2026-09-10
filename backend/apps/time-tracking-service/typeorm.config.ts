import 'reflect-metadata';
import { join } from 'path';
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
  // Was the cwd-relative, .ts-only 'migrations/*.ts'. That resolved only when
  // the TypeORM CLI happened to run from backend/, and matched nothing at all
  // once compiled, so this service's 12 migrations were invisible to
  // run-migrations.js. __dirname + '*.{ts,js}' resolves in both places:
  // apps/time-tracking-service/migrations for the CLI,
  // dist/apps/time-tracking-service/migrations for the compiled reporter.
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  // Staging's Postgres does not support SSL, so keying this off NODE_ENV made
  // every production-mode connection attempt fail outright. DATABASE_SSL_ENABLED
  // is the flag the rest of this monorepo already uses for the same decision
  // (see apps/offer-service/src/config/typeorm.config.ts).
  ssl:
    process.env.DATABASE_SSL_ENABLED === 'true'
      ? { rejectUnauthorized: false }
      : false,
});
