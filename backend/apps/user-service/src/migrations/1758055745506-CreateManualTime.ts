import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateManualTime1758055745506 implements MigrationInterface {
  name = 'CreateManualTime1758055745506';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "manual_time_entries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "projectId" uuid NULL,
        "taskId" uuid NULL,
        "startAt" timestamptz NOT NULL,
        "endAt" timestamptz NOT NULL,
        "note" text NOT NULL DEFAULT '',
        "approved" boolean NOT NULL DEFAULT false,
        "deleted" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_mte_time" CHECK ("endAt" > "startAt")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mte_user_startAt"
      ON "manual_time_entries" ("userId", "startAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mte_user_startAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "manual_time_entries" CASCADE`);
  }
}
