import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Holds a notification email address that has been requested but not yet proven.
 *
 * Settings > Notifications lets someone redirect their notifications to any
 * address, and the address took effect immediately with no proof of ownership.
 * That is enough to point another person's notifications at yourself, or to
 * mistype an address and silently stop receiving anything.
 *
 * The verified address stays where it already lives — `channels.email.address`
 * in the jsonb — so delivery keeps reading exactly what it read before and
 * cannot accidentally start using an unproven value. These columns are the
 * waiting room; nothing reads them at dispatch time.
 *
 * The token is stored as a SHA-256 hash rather than in the clear: it grants a
 * change of address, so a leaked database row should not be enough to complete
 * someone else's verification. Lookup is by hash of the presented token, which
 * works because the hash is deterministic — hence the index.
 *
 * Unqualified names, matching this service's existing migrations, which create
 * `notification_preferences` and `notifications` in the default schema.
 */
export class AddPendingNotificationEmail1798300000000
  implements MigrationInterface
{
  name = 'AddPendingNotificationEmail1798300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_preferences"
        ADD COLUMN IF NOT EXISTS "pendingEmail" character varying(320),
        ADD COLUMN IF NOT EXISTS "pendingEmailTokenHash" character varying(64),
        ADD COLUMN IF NOT EXISTS "pendingEmailExpiresAt" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_prefs_pending_email_token"
        ON "notification_preferences" ("pendingEmailTokenHash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_prefs_pending_email_token"`,
    );
    await queryRunner.query(`
      ALTER TABLE "notification_preferences"
        DROP COLUMN IF EXISTS "pendingEmailExpiresAt",
        DROP COLUMN IF EXISTS "pendingEmailTokenHash",
        DROP COLUMN IF EXISTS "pendingEmail"
    `);
  }
}
