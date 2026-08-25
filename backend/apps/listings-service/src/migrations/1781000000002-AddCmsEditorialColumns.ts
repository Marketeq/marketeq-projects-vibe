import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCmsEditorialColumns1781000000002 implements MigrationInterface {
  name = 'AddCmsEditorialColumns1781000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = 'listings';
    for (const tbl of ['teams', 'services', 'jobs']) {
      const [exists] = await queryRunner.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
        [schema, tbl],
      );
      if (!exists) continue;

      await queryRunner.query(`ALTER TABLE "${schema}"."${tbl}" ADD COLUMN IF NOT EXISTS "payloadId" character varying`);
      await queryRunner.query(`ALTER TABLE "${schema}"."${tbl}" ADD COLUMN IF NOT EXISTS "editorialLabel" character varying`);
      if (tbl === 'jobs') {
        await queryRunner.query(`ALTER TABLE "${schema}"."${tbl}" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false`);
      }
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = '${schema}' AND tablename = '${tbl}' AND indexname = 'UQ_${tbl}_payloadId') THEN
            CREATE UNIQUE INDEX "UQ_${tbl}_payloadId" ON "${schema}"."${tbl}" ("payloadId") WHERE "payloadId" IS NOT NULL;
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        DROP INDEX IF EXISTS "UQ_teams_payloadId";
        ALTER TABLE "teams" DROP COLUMN IF EXISTS "payloadId";
        ALTER TABLE "teams" DROP COLUMN IF EXISTS "editorialLabel";

        DROP INDEX IF EXISTS "UQ_services_payloadId";
        ALTER TABLE "services" DROP COLUMN IF EXISTS "payloadId";
        ALTER TABLE "services" DROP COLUMN IF EXISTS "editorialLabel";

        DROP INDEX IF EXISTS "UQ_jobs_payloadId";
        ALTER TABLE "jobs" DROP COLUMN IF EXISTS "payloadId";
        ALTER TABLE "jobs" DROP COLUMN IF EXISTS "editorialLabel";
        ALTER TABLE "jobs" DROP COLUMN IF EXISTS "featured";
      END $$;
    `);
  }
}
