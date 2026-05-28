import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCmsEditorialColumns1781000000002 implements MigrationInterface {
  name = 'AddCmsEditorialColumns1781000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        -- teams
        ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payloadId" character varying;
        ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "editorialLabel" character varying;

        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE tablename = 'teams' AND indexname = 'UQ_teams_payloadId'
        ) THEN
          CREATE UNIQUE INDEX "UQ_teams_payloadId" ON "teams" ("payloadId") WHERE "payloadId" IS NOT NULL;
        END IF;

        -- services
        ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "payloadId" character varying;
        ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "editorialLabel" character varying;

        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE tablename = 'services' AND indexname = 'UQ_services_payloadId'
        ) THEN
          CREATE UNIQUE INDEX "UQ_services_payloadId" ON "services" ("payloadId") WHERE "payloadId" IS NOT NULL;
        END IF;

        -- jobs
        ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "payloadId" character varying;
        ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "editorialLabel" character varying;
        ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false;

        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE tablename = 'jobs' AND indexname = 'UQ_jobs_payloadId'
        ) THEN
          CREATE UNIQUE INDEX "UQ_jobs_payloadId" ON "jobs" ("payloadId") WHERE "payloadId" IS NOT NULL;
        END IF;
      END $$;
    `);
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
