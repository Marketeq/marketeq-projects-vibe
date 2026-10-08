import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backs the five-panel Settings sheet: per-contract manual-time and
 * delete-approval rules on admin_settings, and each user's screenshot
 * preferences and notification toggles on user_preferences.
 */
export class AddSettingsPanelColumns1790841600000 implements MigrationInterface {
  name = 'AddSettingsPanelColumns1790841600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "time_tracking"."admin_settings"
        ADD COLUMN IF NOT EXISTS "require_delete_approval" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "manual_time_enabled" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "manual_time_require_approval" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "manual_time_require_reason" BOOLEAN NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "time_tracking"."user_preferences"
        ADD COLUMN IF NOT EXISTS "default_screenshot_view" TEXT NOT NULL DEFAULT 'hour',
        ADD COLUMN IF NOT EXISTS "show_tooltips" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "capture_mode" TEXT NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "notify_manual_time" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "notify_reassignment" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "notify_weekly_report" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "notify_screenshot_comments" BOOLEAN NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "time_tracking"."user_preferences"
        DROP COLUMN IF EXISTS "notify_screenshot_comments",
        DROP COLUMN IF EXISTS "notify_weekly_report",
        DROP COLUMN IF EXISTS "notify_reassignment",
        DROP COLUMN IF EXISTS "notify_manual_time",
        DROP COLUMN IF EXISTS "capture_mode",
        DROP COLUMN IF EXISTS "show_tooltips",
        DROP COLUMN IF EXISTS "default_screenshot_view"
    `);
    await queryRunner.query(`
      ALTER TABLE "time_tracking"."admin_settings"
        DROP COLUMN IF EXISTS "manual_time_require_reason",
        DROP COLUMN IF EXISTS "manual_time_require_approval",
        DROP COLUMN IF EXISTS "manual_time_enabled",
        DROP COLUMN IF EXISTS "require_delete_approval"
    `);
  }
}
