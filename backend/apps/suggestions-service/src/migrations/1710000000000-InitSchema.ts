import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suggestion_job_titles (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        industry VARCHAR(100),
        goal VARCHAR(100),
        category VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        usage_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_suggestion_job_titles PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS suggestion_job_titles_trgm_idx ON suggestion_job_titles USING gin (title gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sjt_industry ON suggestion_job_titles (LOWER(industry))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_sjt_title_industry_goal ON suggestion_job_titles (LOWER(title), LOWER(COALESCE(industry, '')), LOWER(COALESCE(goal, '')))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS suggestion_job_titles CASCADE`);
  }
}
