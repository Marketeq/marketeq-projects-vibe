import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateManualTimeAndSettings1713000000000 implements MigrationInterface {
  name = 'CreateManualTimeAndSettings1713000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.manual_time (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        text NOT NULL,
        project_id     text NULL,
        task_id        text NULL,
        start_time     timestamptz NOT NULL,
        end_time       timestamptz NOT NULL,
        notes          text NULL,
        status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by    text NULL,
        review_comment text NULL,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_manual_time_user_status ON time_tracking.manual_time (user_id, status)`);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.admin_settings (
        id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        scope_id              text NOT NULL UNIQUE,
        allow_delete          boolean NOT NULL DEFAULT true,
        allow_blur            boolean NOT NULL DEFAULT true,
        auto_approve_blur     boolean NOT NULL DEFAULT false,
        allow_reassign        boolean NOT NULL DEFAULT true,
        deleted_non_billable  boolean NOT NULL DEFAULT true,
        blurred_billable      boolean NOT NULL DEFAULT true,
        created_at            timestamptz NOT NULL DEFAULT now(),
        updated_at            timestamptz NOT NULL DEFAULT now()
      )
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.user_preferences (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      text NOT NULL UNIQUE,
        timezone     text NOT NULL DEFAULT 'UTC',
        date_format  text NOT NULL DEFAULT 'MM/DD/YYYY',
        start_of_week text NOT NULL DEFAULT 'Sunday' CHECK (start_of_week IN ('Sunday', 'Monday')),
        time_format  text NOT NULL DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
        updated_at   timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS time_tracking.user_preferences`);
    await qr.query(`DROP TABLE IF EXISTS time_tracking.admin_settings`);
    await qr.query(`DROP INDEX IF EXISTS time_tracking.idx_manual_time_user_status`);
    await qr.query(`DROP TABLE IF EXISTS time_tracking.manual_time`);
  }
}
