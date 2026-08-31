import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `users.activeRole`: which role an account is currently acting as.
 *
 * An account can hold both roles (`talentOnboardedAt` and `clientOnboardedAt`
 * are tracked separately, and 18 accounts already have both). The two existing
 * columns cannot express the active session:
 *
 *   - `role` is a single-valued label and routinely disagrees with `userType`.
 *     83 accounts are stored as role CLIENT with userType talent, and 91 have a
 *     null role with userType talent.
 *   - `userType` is likewise single-valued and is set at onboarding, not on
 *     switch.
 *
 * The account switcher wrote its choice to an `accountType` field that exists
 * only in the browser's in-memory user object, so the active role was lost on
 * every reload and the UI fell back to inferring from `role`, showing the wrong
 * role's features.
 *
 * Nullable with no default and no backfill on purpose: existing rows keep
 * resolving through the old inference, so nothing that works today changes
 * behaviour. Only accounts that actively switch get a value.
 */
export class AddUsersActiveRole1797200000000 implements MigrationInterface {
  name = 'AddUsersActiveRole1797200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.users
      ADD COLUMN IF NOT EXISTS "activeRole" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.users
      DROP COLUMN IF EXISTS "activeRole"
    `);
  }
}
