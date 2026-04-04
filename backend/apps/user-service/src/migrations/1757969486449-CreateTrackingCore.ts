import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTrackingCore1757969486449 implements MigrationInterface {
  name = 'CreateTrackingCore1757969486449';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 🚨 Dev-safe: nuke any mismatched remnants so we have a clean slate
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_screenshots_user_takenAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "screenshots" CASCADE`);

    await queryRunner.query(`
      CREATE TABLE "screenshots" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "projectId" uuid NULL,
        "taskId" uuid NULL,
        "takenAt" timestamptz NOT NULL,
        "imageUrl" varchar(1024) NOT NULL,
        "activityPercent" smallint NOT NULL DEFAULT 0
          CHECK ("activityPercent" BETWEEN 0 AND 100),
        "appsUsed" text[] NOT NULL DEFAULT '{}'::text[],
        "blurred" boolean NOT NULL DEFAULT false,
        "deleted" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_screenshots_user_takenAt"
      ON "screenshots" ("userId", "takenAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_screenshots_user_takenAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "screenshots" CASCADE`);
  }
}
