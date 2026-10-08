import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Holds a recovery email address that has been requested but not yet proven.
 *
 * Settings > Account Recovery lets someone nominate an address to recover the
 * account with. An unproven address is worse than none: it is a typo away from
 * silently losing the only way back in, and a deliberate entry away from
 * pointing someone else's recovery at your own inbox.
 *
 * So the proven address lives in `recoveryEmail` and the requested one waits in
 * `pendingRecoveryEmail`. Nothing that performs recovery reads the pending
 * column, which makes it impossible to act on an address nobody confirmed.
 *
 * The token is stored as a SHA-256 hash rather than in the clear, matching
 * `AddPendingNotificationEmail1798300000000` in notification-service. Lookup is
 * by hash of the presented token — deterministic, hence the index.
 */
export class AddRecoveryEmailToUsers1798500000000 implements MigrationInterface {
  name = 'AddRecoveryEmailToUsers1798500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "recoveryEmail" character varying(320),
        ADD COLUMN IF NOT EXISTS "pendingRecoveryEmail" character varying(320),
        ADD COLUMN IF NOT EXISTS "recoveryEmailTokenHash" character varying(64),
        ADD COLUMN IF NOT EXISTS "recoveryEmailExpiresAt" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_recovery_email_token"
        ON "users" ("recoveryEmailTokenHash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_users_recovery_email_token"`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "recoveryEmailExpiresAt",
        DROP COLUMN IF EXISTS "recoveryEmailTokenHash",
        DROP COLUMN IF EXISTS "pendingRecoveryEmail",
        DROP COLUMN IF EXISTS "recoveryEmail"
    `);
  }
}
