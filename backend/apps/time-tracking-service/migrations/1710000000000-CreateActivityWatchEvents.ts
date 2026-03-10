import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivityWatchEvents1710000000000 implements MigrationInterface {
  name = 'CreateActivityWatchEvents1710000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.activity_watch_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NULL,
        bucket_id text NOT NULL,
        event_type text NOT NULL,
        data jsonb NOT NULL,
        start_time timestamptz NOT NULL,
        end_time timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_awe_user_start ON time_tracking.activity_watch_events (user_id, start_time DESC)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_awe_bucket_start ON time_tracking.activity_watch_events (bucket_id, start_time DESC)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_awe_event_type ON time_tracking.activity_watch_events (event_type)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS idx_awe_event_type`);
    await q.query(`DROP INDEX IF EXISTS idx_awe_bucket_start`);
    await q.query(`DROP INDEX IF EXISTS idx_awe_user_start`);
    await q.query(`DROP TABLE IF EXISTS time_tracking.activity_watch_events`);
  }
}
