import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessions1717000000000 implements MigrationInterface {
  name = 'CreateSessions1717000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.sessions (
        id            TEXT        NOT NULL,
        user_id       TEXT        NOT NULL,
        contract_id   TEXT        NOT NULL,
        task_id       TEXT        NOT NULL,
        device_id     TEXT        NOT NULL,
        started_at    TIMESTAMPTZ NOT NULL,
        ended_at      TIMESTAMPTZ,
        end_reason    TEXT,
        billable_seconds INT      NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_sessions PRIMARY KEY (id)
      )
    `);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_contract ON time_tracking.sessions (user_id, contract_id)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON time_tracking.sessions (started_at)`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS time_tracking.sessions`);
  }
}
