import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Restores profile columns that were accidentally dropped from the `User`
 * entity in commit 371fd4f3 ("fix(user-service): align user entity with
 * actual DB schema"). Without these columns present, Talent onboarding and
 * the `user-settings` endpoints silently drop writes because TypeORM strips
 * unknown entity properties on `save()`.
 *
 * This migration is fully idempotent — each column is added with IF NOT
 * EXISTS so environments that already have the columns from the legacy
 * 1772000000000 migration are unchanged.
 *
 * NOTE on schema qualification: runtime TypeORM (`app.module.ts`) configures
 * `schema: 'user_service'`, but historical migrations issue unqualified
 * `"users"` DDL. Until the applied history is qualified we must keep the
 * same unqualified form to avoid hitting a non-existent table. When the
 * service is next cut over to a fully qualified schema, re-do this as
 * `"user_service"."users"`.
 */
export class RestoreUserProfileColumns1773700000000
  implements MigrationInterface
{
  name = 'RestoreUserProfileColumns1773700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recentJobTitle" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "industriesWorkedIn" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lookingToWorkWith" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "projectTypes" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "customAvailability" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isStudent" boolean DEFAULT false`,
    );
  }

  // Forward-only — never drop data on rollback.
  public async down(): Promise<void> {
    return;
  }
}
