import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobListingDraftFieldMappings1783700000000 implements MigrationInterface {
  name = "AddJobListingDraftFieldMappings1783700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_listings"
      ADD COLUMN IF NOT EXISTS "category_selections" jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "tags" text[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "skills" text[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "tools" text[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "media" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_listings"
      DROP COLUMN IF EXISTS "media",
      DROP COLUMN IF EXISTS "tools",
      DROP COLUMN IF EXISTS "skills",
      DROP COLUMN IF EXISTS "tags",
      DROP COLUMN IF EXISTS "category_selections"
    `);
  }
}
