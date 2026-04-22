import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlugColumn1776457086364 implements MigrationInterface {
  name = 'AddSlugColumn1776457086364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // listings schema (primary table used by listings-service)
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "listings"."projects" ADD COLUMN IF NOT EXISTS "slug" character varying`,
    );

    // public schema (legacy/read adapters in this repo still reference public tables)
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "public"."projects" ADD COLUMN IF NOT EXISTS "slug" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "public"."project" ADD COLUMN IF NOT EXISTS "slug" character varying`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_projects_slug" ON "listings"."projects" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_public_projects_slug" ON "public"."projects" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_public_project_slug" ON "public"."project" ("slug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "listings"."IDX_listings_projects_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_public_projects_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_public_project_slug"`);

    await queryRunner.query(
      `ALTER TABLE IF EXISTS "listings"."projects" DROP COLUMN IF EXISTS "slug"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "public"."projects" DROP COLUMN IF EXISTS "slug"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "public"."project" DROP COLUMN IF EXISTS "slug"`,
    );
  }
}
