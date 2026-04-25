import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandNotificationPreferences1776700000000
  implements MigrationInterface
{
  name = "ExpandNotificationPreferences1776700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable("notification_preferences");
    if (!hasTable) {
      // Table will be created by synchronize in dev; production has the
      // InitSchema baseline plus prior migrations before this one runs.
      return;
    }
    await queryRunner.query(
      `ALTER TABLE "notification_preferences"
       ADD COLUMN IF NOT EXISTS "channels" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences"
       ADD COLUMN IF NOT EXISTS "categories" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences"
       ADD COLUMN IF NOT EXISTS "notifications" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable("notification_preferences");
    if (!hasTable) return;
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "notifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "categories"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "channels"`,
    );
  }
}
