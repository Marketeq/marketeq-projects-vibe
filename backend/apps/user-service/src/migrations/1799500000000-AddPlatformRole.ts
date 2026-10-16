import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the column that will carry a *security* role, separate from the
 * profile label already stored in `role`.
 *
 * `role` cannot be reused for this. It is a nullable, freeform label that
 * means talent or client, it is written by ordinary signup and onboarding
 * flows, and `UpdateUserDto` (a PartialType of `CreateUserDto`) exposes it —
 * so the field a user legitimately sets about themselves would also be the
 * field granting platform administration.
 *
 * `platform_role` is deliberately absent from every DTO. user-service runs
 * ValidationPipe with `whitelist` and `forbidNonWhitelisted`, so a request
 * carrying `platformRole` is rejected with a 400 rather than silently
 * assigned by `Object.assign(user, dto)` in `updateUser`. The only way to set
 * it is a deliberate admin path or a database statement.
 *
 * Nullable with no default: absence means "ordinary user", which is every
 * account today. Nothing changes behaviour until a role claim reaches the
 * token and the guards start reading it — see the Option A sequence in
 * docs/md/CyberSecurity/Privileged Access & RBAC — Audit and First Fixes.md.
 *
 * Stored as text rather than a Postgres enum: the value list will grow
 * (support and finance separation is likely, given who reviews wires versus
 * who manages content), an enum needs a migration for each addition, and a
 * stored value dropped from the list would break reads instead of simply
 * displaying.
 *
 * Schema-qualified: an unqualified ALTER TABLE lands in `public`, not the
 * service schema.
 */
export class AddPlatformRole1799500000000 implements MigrationInterface {
  name = 'AddPlatformRole1799500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.users
        ADD COLUMN IF NOT EXISTS "platform_role" character varying(32)
    `);
    // Finding an admin must not scan the whole table, and almost every row is
    // NULL, so index only the rows that have a value.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_platform_role"
        ON user_service.users ("platform_role")
        WHERE "platform_role" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS user_service."idx_users_platform_role"
    `);
    await queryRunner.query(`
      ALTER TABLE user_service.users
        DROP COLUMN IF EXISTS "platform_role"
    `);
  }
}
