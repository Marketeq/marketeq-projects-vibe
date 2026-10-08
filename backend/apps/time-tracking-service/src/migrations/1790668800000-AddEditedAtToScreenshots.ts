import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds time_tracking.screenshots.edited_at — stamped whenever a screenshot's
 * contract or task is changed after capture. It backs the "Edited Time"
 * time-entry filter (US-TT-026); untouched captures stay null.
 */
export class AddEditedAtToScreenshots1790668800000 implements MigrationInterface {
  name = 'AddEditedAtToScreenshots1790668800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."screenshots" ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMPTZ NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."screenshots" DROP COLUMN IF EXISTS "edited_at"`,
    );
  }
}
