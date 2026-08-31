import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the missing `company_users.user_id` -> `users.id` foreign key.
 *
 * CreateCompaniesSchema1796600000000 constrained `company_id` but left
 * `user_id` unconstrained, so nothing at the database level stopped a
 * membership row from pointing at a user that does not exist. Two paths
 * produced exactly that:
 *
 *   1. `UserService.deleteUser` removes the user row without touching
 *      `company_users`, stranding every membership that user held.
 *   2. `UserService.syncFromAuth` used to throw when an email already existed
 *      under a different id (an account deleted and re-created in auth), so
 *      the new auth id never got a profile row while invitation accepts kept
 *      writing memberships under it.
 *
 * The resulting rows were invisible rather than loud: `getMembers` resolves
 * emails by joining to `users`, so an unresolvable membership came back with
 * `email: undefined` and the invite UI filtered it out of the roster.
 *
 * ON DELETE CASCADE also makes `deleteUser` correct without service changes.
 * Removing a user now takes their memberships with it.
 *
 * Every identifier is schema-qualified with "user_service": raw
 * queryRunner.query() calls do not inherit the DataSource's `schema` option
 * as a search_path, matching CreateCompaniesSchema1796600000000.
 */
export class AddCompanyUsersUserFk1797100000000 implements MigrationInterface {
  name = 'AddCompanyUsersUserFk1797100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The constraint cannot be added while violating rows exist. These are
    // memberships belonging to users that are already gone, so there is
    // nothing to preserve. The roster has been unable to render them for as
    // long as they have existed.
    await queryRunner.query(
      `DELETE FROM "user_service"."company_users" cu
       WHERE NOT EXISTS (
         SELECT 1 FROM "user_service"."users" u WHERE u.id = cu.user_id
       )`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_service"."company_users"
       ADD CONSTRAINT "FK_company_users_user_id"
       FOREIGN KEY ("user_id") REFERENCES "user_service"."users"("id")
       ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_service"."company_users"
       DROP CONSTRAINT IF EXISTS "FK_company_users_user_id"`,
    );
  }
}
