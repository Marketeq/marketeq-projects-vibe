import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEarningsCache1700000001000 implements MigrationInterface {
  name = 'CreateEarningsCache1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE earnings_cache (
        id                UUID          NOT NULL DEFAULT gen_random_uuid(),
        transaction_id    UUID          NOT NULL,
        contractor_id     UUID          NOT NULL,
        contract_id       UUID,
        project_id        UUID,
        task_id           UUID,
        entry_type        VARCHAR(20)   NOT NULL,
        gross_amount      NUMERIC(18,8) NOT NULL,
        fee_amount        NUMERIC(18,8) NOT NULL,
        net_amount        NUMERIC(18,8) NOT NULL,
        currency          VARCHAR(3)    NOT NULL,
        fx_rate_to_usd    NUMERIC(18,8) NOT NULL,
        net_amount_usd    NUMERIC(18,8) NOT NULL,
        status            VARCHAR(20)   NOT NULL DEFAULT 'confirmed',
        work_start_at     TIMESTAMPTZ   NOT NULL,
        work_end_at       TIMESTAMPTZ   NOT NULL,
        duration_minutes  INTEGER       NOT NULL,
        avg_keyboard_pct  INTEGER,
        avg_mouse_pct     INTEGER,
        idempotency_key   VARCHAR(128)  NOT NULL,
        created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        reversed_at       TIMESTAMPTZ,
        CONSTRAINT earnings_cache_pkey                PRIMARY KEY (id),
        CONSTRAINT ux_earnings_cache_transaction_id   UNIQUE (transaction_id),
        CONSTRAINT ux_earnings_cache_idempotency_key  UNIQUE (idempotency_key)
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_earnings_cache_contractor_id      ON earnings_cache (contractor_id);`);
    await queryRunner.query(`CREATE INDEX idx_earnings_cache_contractor_created  ON earnings_cache (contractor_id, created_at DESC);`);
    await queryRunner.query(`CREATE INDEX idx_earnings_cache_contractor_status   ON earnings_cache (contractor_id, status);`);
    await queryRunner.query(`CREATE INDEX idx_earnings_cache_contract_id         ON earnings_cache (contract_id);`);
    await queryRunner.query(`CREATE INDEX idx_earnings_cache_work_start          ON earnings_cache (contractor_id, work_start_at DESC);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS earnings_cache;`);
  }
}
