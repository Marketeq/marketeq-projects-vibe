import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds time_tracking.screenshots.blur_reason: the reason a talent gives when
 * blurring a screenshot ("Blur Screenshots" modal), shown to the contract's
 * client when the blur needs review. Cleared on unblur.
 */
export class AddBlurReasonToScreenshots1791100800000 implements MigrationInterface {
  name = 'AddBlurReasonToScreenshots1791100800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."screenshots" ADD COLUMN IF NOT EXISTS "blur_reason" TEXT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."screenshots" DROP COLUMN IF EXISTS "blur_reason"`,
    );
  }
}
