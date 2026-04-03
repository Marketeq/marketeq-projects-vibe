import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFxRateCache1700000003000 implements MigrationInterface {
  name = 'CreateFxRateCache1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE fx_rate_cache (
        id             UUID          NOT NULL DEFAULT gen_random_uuid(),
        from_currency  VARCHAR(3)    NOT NULL,
        to_currency    VARCHAR(3)    NOT NULL,
        rate           NUMERIC(18,8) NOT NULL,
        fetched_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
        expires_at     TIMESTAMPTZ   NOT NULL,
        CONSTRAINT fx_rate_cache_pkey   PRIMARY KEY (id),
        CONSTRAINT ux_fx_rate_cache_pair UNIQUE (from_currency, to_currency)
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_fx_rate_cache_expires ON fx_rate_cache (expires_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS fx_rate_cache;`);
  }
}
