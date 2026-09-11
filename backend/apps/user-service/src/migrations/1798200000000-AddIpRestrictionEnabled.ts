import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Storage for the "Enable IP Restriction" switch on Settings > IP Restrictions.
 *
 * The switch was React state, so it reset on every reload — including back to
 * on, which is the more alarming direction for something presented as a
 * security control.
 *
 * Nullable with no default rather than `NOT NULL DEFAULT true`. Null means
 * "has never touched this screen", which is not the same as having deliberately
 * switched restriction off. Only the first is safe to reinterpret if the
 * product default changes later; baking a default into the column now would
 * make those two states indistinguishable forever.
 *
 * Lives on the user row for the same reason `allowed_ips` scopes by user: the
 * personal-or-account-wide question is still open, and per-user is the
 * private-by-default reading of it.
 *
 * Schema-qualified: an unqualified ALTER TABLE lands in `public`, not the
 * service schema.
 */
export class AddIpRestrictionEnabled1798200000000 implements MigrationInterface {
  name = 'AddIpRestrictionEnabled1798200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.users
        ADD COLUMN IF NOT EXISTS "ip_restriction_enabled" boolean
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.users
        DROP COLUMN IF EXISTS "ip_restriction_enabled"
    `);
  }
}
