import { MigrationInterface, QueryRunner } from "typeorm";

export class UsernameNullablePartialUniqueIndex1773400000000
  implements MigrationInterface
{
  name = 'UsernameNullablePartialUniqueIndex1773400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "username" DROP NOT NULL
    `);

    // Convert "empty" usernames to NULL so the new partial unique index
    // (unique only when username IS NOT NULL) can be created successfully.
    await queryRunner.query(`
      UPDATE "users"
      SET "username" = NULL
      WHERE "username" IS NOT NULL AND btrim("username") = ''
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_fe0bb3f6520ee0469504521e71"`,
    );

    // Enforce uniqueness only for actual usernames; allow multiple NULLs.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_username_unique_not_null"
      ON "users" ("username")
      WHERE "username" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_users_username_unique_not_null"`,
    );

    // Best-effort rollback: assign deterministic unique placeholders.
    await queryRunner.query(`
      UPDATE "users"
      SET "username" = 'user_' || "id"
      WHERE "username" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "username" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71"
      ON "users" ("username")
    `);
  }
}

