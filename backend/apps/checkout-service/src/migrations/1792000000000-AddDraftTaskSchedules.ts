import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDraftTaskSchedules1792000000000 implements MigrationInterface {
  name = 'AddDraftTaskSchedules1792000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."draft_tasks"
      ADD COLUMN IF NOT EXISTS "workSchedule" varchar(20) NOT NULL DEFAULT 'full_time'
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."draft_tasks"
      ADD COLUMN IF NOT EXISTS "customHoursPerWeek" integer
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."draft_tasks"
      DROP COLUMN IF EXISTS "customHoursPerWeek"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."draft_tasks"
      DROP COLUMN IF EXISTS "workSchedule"
    `);
  }
}
