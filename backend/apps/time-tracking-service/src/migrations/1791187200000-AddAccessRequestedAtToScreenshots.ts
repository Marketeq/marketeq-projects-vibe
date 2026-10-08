import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds time_tracking.screenshots.access_requested_at: set when the contract's
 * client asks to see a screenshot the talent blurred ("Request Access").
 * Cleared when the screenshot is unblurred. Null means no request is open.
 */
export class AddAccessRequestedAtToScreenshots1791187200000 implements MigrationInterface {
  name = 'AddAccessRequestedAtToScreenshots1791187200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."screenshots" ADD COLUMN IF NOT EXISTS "access_requested_at" TIMESTAMPTZ NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."screenshots" DROP COLUMN IF EXISTS "access_requested_at"`,
    );
  }
}
