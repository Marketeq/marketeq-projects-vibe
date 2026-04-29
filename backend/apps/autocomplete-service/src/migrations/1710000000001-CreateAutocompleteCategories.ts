import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAutocompleteCategories1710000000001
  implements MigrationInterface
{
  name = 'CreateAutocompleteCategories1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "autocomplete_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "parentSlug" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_autocomplete_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_autocomplete_categories_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_autocomplete_categories_slug"
      ON "autocomplete_categories" ("slug")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_autocomplete_categories_slug"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "autocomplete_categories"`);
  }
}

