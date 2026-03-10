import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScreenshots1712345678901 implements MigrationInterface {
  name = 'CreateScreenshots1712345678901';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.screenshots (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       text NOT NULL,
        "key"         text NOT NULL,
        mime_type     text NOT NULL,
        bytes         integer NOT NULL CHECK (bytes >= 0),
        is_deleted    boolean NOT NULL DEFAULT false,
        captured_at   timestamptz NULL,
        project_id    text NULL,
        task_id       text NULL,
        keyboard      integer NOT NULL DEFAULT 0,
        mouse         integer NOT NULL DEFAULT 0,
        keyboard_pct  float NULL,
        mouse_pct     float NULL,
        app_usage     jsonb NULL,
        is_blurred    boolean NOT NULL DEFAULT false,
        blurred_at    timestamptz NULL,
        review_status text NULL CHECK (review_status IN ('pending', 'approved', 'rejected')),
        deleted_at    timestamptz NULL,
        deletion_reason text NULL,
        monitor_id    text NULL,
        group_key     text NULL,
        created_at    timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_screenshots_key ON time_tracking.screenshots ("key")`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_screenshots_user_created ON time_tracking.screenshots (user_id, created_at DESC)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_screenshots_group_key ON time_tracking.screenshots (group_key) WHERE group_key IS NOT NULL`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_screenshots_visible ON time_tracking.screenshots (user_id, created_at DESC) WHERE is_deleted = false`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_screenshots_visible`);
    await qr.query(`DROP INDEX IF EXISTS idx_screenshots_group_key`);
    await qr.query(`DROP INDEX IF EXISTS idx_screenshots_user_created`);
    await qr.query(`DROP INDEX IF EXISTS ux_screenshots_key`);
    await qr.query(`DROP TABLE IF EXISTS time_tracking.screenshots`);
  }
}
