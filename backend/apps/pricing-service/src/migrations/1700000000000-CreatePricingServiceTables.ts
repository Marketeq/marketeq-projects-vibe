import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePricingServiceTables1700000000000 implements MigrationInterface {
  name = 'CreatePricingServiceTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── ps_platform_rate_averages ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ps_platform_rate_averages (
        id                            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        role                          VARCHAR(100)  NOT NULL,
        region                        VARCHAR(100)  NOT NULL,
        experience_level              VARCHAR(20)   NOT NULL,
        schedule                      VARCHAR(20)   NOT NULL,
        hourly_rate_low_usd_cents     INTEGER       NOT NULL,
        hourly_rate_median_usd_cents  INTEGER       NOT NULL,
        hourly_rate_high_usd_cents    INTEGER       NOT NULL,
        sample_size                   INTEGER       NOT NULL DEFAULT 0,
        last_updated                  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at                    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_platform_rate_averages
          UNIQUE (role, region, experience_level, schedule)
      )
    `);

    // ── ps_currency_rates ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ps_currency_rates (
        id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        from_currency  VARCHAR(3)    NOT NULL,
        to_currency    VARCHAR(3)    NOT NULL,
        rate           DECIMAL(14,6) NOT NULL,
        fetched_at     TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at     TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_currency_rates
          UNIQUE (from_currency, to_currency)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ps_currency_rates`);
    await queryRunner.query(`DROP TABLE IF EXISTS ps_platform_rate_averages`);
  }
}
