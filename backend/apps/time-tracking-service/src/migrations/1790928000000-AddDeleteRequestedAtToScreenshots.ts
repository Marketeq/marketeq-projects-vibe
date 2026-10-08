import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds time_tracking.screenshots.delete_requested_at. When a contract has
 * "Require approval for deleted screenshots" on, a talent's delete only
 * stamps this column; the screenshot stays (and keeps counting) until the
 * contract's client approves, which soft-deletes it, or rejects, which
 * clears the request. Null means no request is pending.
 */
export class AddDeleteRequestedAtToScreenshots1790928000000 implements MigrationInterface {
  name = 'AddDeleteRequestedAtToScreenshots1790928000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."screenshots" ADD COLUMN IF NOT EXISTS "delete_requested_at" TIMESTAMPTZ NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."screenshots" DROP COLUMN IF EXISTS "delete_requested_at"`,
    );
  }
}
