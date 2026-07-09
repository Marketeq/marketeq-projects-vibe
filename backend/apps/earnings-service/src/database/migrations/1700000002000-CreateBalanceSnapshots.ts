import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBalanceSnapshots1700000002000 implements MigrationInterface {
  name = 'CreateBalanceSnapshots1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE balance_snapshots (
        contractor_id              UUID          NOT NULL,
        available_balance          NUMERIC(18,8) NOT NULL DEFAULT 0,
        available_balance_local    NUMERIC(18,8) NOT NULL DEFAULT 0,
        available_balance_display  NUMERIC(18,8) NOT NULL DEFAULT 0,
        display_currency           VARCHAR(3)    NOT NULL DEFAULT 'USD',
        local_currency             VARCHAR(3)    NOT NULL DEFAULT 'USD',
        total_earned_usd           NUMERIC(18,8) NOT NULL DEFAULT 0,
        total_paid_out_usd         NUMERIC(18,8) NOT NULL DEFAULT 0,
        pending_hold_usd           NUMERIC(18,8) NOT NULL DEFAULT 0,
        last_credit_at             TIMESTAMPTZ,
        last_debit_at              TIMESTAMPTZ,
        updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT balance_snapshots_pkey PRIMARY KEY (contractor_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_balance_snapshots_updated ON balance_snapshots (updated_at DESC);`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_balance_snapshot_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_balance_snapshots_updated_at
      BEFORE UPDATE ON balance_snapshots
      FOR EACH ROW EXECUTE FUNCTION update_balance_snapshot_timestamp();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_balance_snapshots_updated_at ON balance_snapshots;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_balance_snapshot_timestamp;`);
    await queryRunner.query(`DROP TABLE IF EXISTS balance_snapshots;`);
  }
}
