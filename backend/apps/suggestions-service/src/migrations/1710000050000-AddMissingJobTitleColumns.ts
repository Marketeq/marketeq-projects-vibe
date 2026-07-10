import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingJobTitleColumns1710000050000 implements MigrationInterface {
  name = 'AddMissingJobTitleColumns1710000050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // suggestion_job_titles already existed in the shared production database from an
    // earlier version of this feature (PR #311), with a schema older than InitSchema1710000000000
    // expects. CREATE TABLE IF NOT EXISTS silently no-ops against that stale table, so
    // SeedJobTitles1710000100000 fails inserting into columns that were never added.
    // ADD COLUMN IF NOT EXISTS makes each column addition idempotent regardless of the
    // table's actual prior state.
    await queryRunner.query(`ALTER TABLE suggestion_job_titles ADD COLUMN IF NOT EXISTS industry VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE suggestion_job_titles ADD COLUMN IF NOT EXISTS goal VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE suggestion_job_titles ADD COLUMN IF NOT EXISTS category VARCHAR(100)`);
    await queryRunner.query(
      `ALTER TABLE suggestion_job_titles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE suggestion_job_titles ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE suggestion_job_titles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: these columns may already have been relied on by data written before this
    // migration existed, so dropping them on rollback is not safe.
  }
}
