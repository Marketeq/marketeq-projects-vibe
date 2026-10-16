import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-channel progress and a lease on each idempotency key, so a retried `notification.send`
 * resumes at the channel that did not finish instead of repeating the ones that did, and a
 * worker that died mid-delivery does not leave the notification undelivered forever.
 *
 * Rows that exist already were written by the earlier claim-only scheme, where a claim meant
 * "delivered or being delivered"; they are marked completed so a late redelivery of an old
 * message is still dropped as a duplicate. Additive: nothing is dropped or rewritten.
 */
export class AddNotificationIdempotencyProgress1798500000000 implements MigrationInterface {
  name = 'AddNotificationIdempotencyProgress1798500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_idempotency"
        ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP WITH TIME ZONE NULL,
        ADD COLUMN IF NOT EXISTS "notificationId" uuid NULL,
        ADD COLUMN IF NOT EXISTS "ablyDone" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "emailDone" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP WITH TIME ZONE NULL
    `);
    await queryRunner.query(`
      UPDATE "notification_idempotency" SET "completedAt" = "createdAt" WHERE "completedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_idempotency"
        DROP COLUMN IF EXISTS "completedAt",
        DROP COLUMN IF EXISTS "emailDone",
        DROP COLUMN IF EXISTS "ablyDone",
        DROP COLUMN IF EXISTS "notificationId",
        DROP COLUMN IF EXISTS "lockedUntil"
    `);
  }
}
