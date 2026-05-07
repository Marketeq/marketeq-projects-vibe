import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReports1777661854317 implements MigrationInterface {
  name = 'CreateReports1777661854317';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'report_status' AND n.nspname = 'user_service'
        ) THEN
          CREATE TYPE "user_service"."report_status" AS ENUM (
            'pending', 'reviewing', 'actioned', 'dismissed'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service"."reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reporterId" uuid NOT NULL,
        "reportedId" uuid NOT NULL,
        "reason" text NOT NULL,
        "contextThreadId" uuid,
        "contextMessageId" uuid,
        "status" "user_service"."report_status" NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports_id" PRIMARY KEY ("id"),
        CONSTRAINT "ck_reports_no_self" CHECK ("reporterId" <> "reportedId")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_reports_reporterId_users_id'
        ) THEN
          ALTER TABLE "user_service"."reports"
          ADD CONSTRAINT "FK_reports_reporterId_users_id"
          FOREIGN KEY ("reporterId") REFERENCES "user_service"."users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_reports_reportedId_users_id'
        ) THEN
          ALTER TABLE "user_service"."reports"
          ADD CONSTRAINT "FK_reports_reportedId_users_id"
          FOREIGN KEY ("reportedId") REFERENCES "user_service"."users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reports_reporter" ON "user_service"."reports" ("reporterId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reports_reported" ON "user_service"."reports" ("reportedId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reports_status" ON "user_service"."reports" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "user_service"."idx_reports_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "user_service"."idx_reports_reported"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "user_service"."idx_reports_reporter"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_service"."reports" DROP CONSTRAINT IF EXISTS "FK_reports_reportedId_users_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_service"."reports" DROP CONSTRAINT IF EXISTS "FK_reports_reporterId_users_id"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_service"."reports"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "user_service"."report_status"`,
    );
  }
}
