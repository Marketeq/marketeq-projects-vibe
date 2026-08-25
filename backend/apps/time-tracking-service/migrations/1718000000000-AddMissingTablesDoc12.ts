import { MigrationInterface, QueryRunner } from 'typeorm';
 
export class AddMissingTablesDoc121718000000000 implements MigrationInterface {
  name = 'AddMissingTablesDoc121718000000000';
 
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Alter sessions: add missing columns from Doc 12 §4.6
    await queryRunner.query(`
      ALTER TABLE time_tracking.sessions
        ADD COLUMN IF NOT EXISTS paid_break_seconds    INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS unpaid_break_seconds  INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS idle_seconds           INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS disputed               BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS approved               BOOLEAN,
        ADD COLUMN IF NOT EXISTS approved_at            TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS approved_by            TEXT,
        ADD COLUMN IF NOT EXISTS idempotency_key        TEXT
    `);
 
    // time_entry (Doc 12 §4.7)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.time_entries (
        id                TEXT PRIMARY KEY,
        session_id        TEXT NOT NULL,
        started_at        TIMESTAMPTZ NOT NULL,
        ended_at          TIMESTAMPTZ,
        duration_seconds  INTEGER NOT NULL DEFAULT 0,
        idempotency_key   TEXT UNIQUE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_te_session ON time_tracking.time_entries(session_id, started_at)`);
 
    // break_event (Doc 12 §4.8)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.break_events (
        id              TEXT PRIMARY KEY,
        session_id      TEXT NOT NULL,
        kind            TEXT NOT NULL DEFAULT 'unpaid',
        started_at      TIMESTAMPTZ NOT NULL,
        ended_at        TIMESTAMPTZ,
        idempotency_key TEXT UNIQUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_break_session ON time_tracking.break_events(session_id, started_at)`);
 
    // idle_event (Doc 12 §4.9)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.idle_events (
        id              TEXT PRIMARY KEY,
        session_id      TEXT NOT NULL,
        started_at      TIMESTAMPTZ NOT NULL,
        ended_at        TIMESTAMPTZ NOT NULL,
        seconds         INTEGER NOT NULL,
        resolution      TEXT,
        idempotency_key TEXT UNIQUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_idle_session ON time_tracking.idle_events(session_id, started_at)`);
 
    // activity_minute (Doc 12 §4.11)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.activity_minutes (
        id              TEXT PRIMARY KEY,
        session_id      TEXT NOT NULL,
        minute_start_at TIMESTAMPTZ NOT NULL,
        active          BOOLEAN NOT NULL,
        idempotency_key TEXT UNIQUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (session_id, minute_start_at)
      )
    `);
 
    // dispute (Doc 12 §4.12)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.disputes (
        id              TEXT PRIMARY KEY,
        session_id      TEXT NOT NULL,
        opened_by       TEXT NOT NULL,
        reason          TEXT NOT NULL DEFAULT 'other',
        note            TEXT,
        status          TEXT NOT NULL DEFAULT 'open',
        resolved_at     TIMESTAMPTZ,
        resolved_by     TEXT,
        resolution_note TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dispute_session ON time_tracking.disputes(session_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dispute_status ON time_tracking.disputes(status)`);
 
    // device_registration (Doc 12 §4.2)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.device_registrations (
        id                TEXT PRIMARY KEY,
        user_id           TEXT NOT NULL,
        installation_uuid TEXT NOT NULL UNIQUE,
        os_name           TEXT NOT NULL,
        os_version        TEXT NOT NULL,
        app_version       TEXT NOT NULL,
        arch              TEXT NOT NULL,
        last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_device_user ON time_tracking.device_registrations(user_id)`);
 
    // idempotency_store (Doc 12 §4.13)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.idempotency_store (
        key         TEXT PRIMARY KEY,
        status_code INTEGER NOT NULL,
        body_json   TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at  TIMESTAMPTZ NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_idemp_expires ON time_tracking.idempotency_store(expires_at)`);
  }
 
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS time_tracking.idempotency_store`);
    await queryRunner.query(`DROP TABLE IF EXISTS time_tracking.device_registrations`);
    await queryRunner.query(`DROP TABLE IF EXISTS time_tracking.disputes`);
    await queryRunner.query(`DROP TABLE IF EXISTS time_tracking.activity_minutes`);
    await queryRunner.query(`DROP TABLE IF EXISTS time_tracking.idle_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS time_tracking.break_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS time_tracking.time_entries`);
    await queryRunner.query(`
      ALTER TABLE time_tracking.sessions
        DROP COLUMN IF EXISTS paid_break_seconds,
        DROP COLUMN IF EXISTS unpaid_break_seconds,
        DROP COLUMN IF EXISTS idle_seconds,
        DROP COLUMN IF EXISTS disputed,
        DROP COLUMN IF EXISTS approved,
        DROP COLUMN IF EXISTS approved_at,
        DROP COLUMN IF EXISTS approved_by,
        DROP COLUMN IF EXISTS idempotency_key
    `);
  }
}