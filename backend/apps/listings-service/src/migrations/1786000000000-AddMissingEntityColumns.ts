import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingEntityColumns1786000000000 implements MigrationInterface {
  name = 'AddMissingEntityColumns1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tbl = '"listings"."project"';

    // Scalar / varchar columns
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "listingType" character varying NOT NULL DEFAULT 'project'`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "payloadId" character varying`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "strapiId" character varying`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "slug" text`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "subtitle" character varying`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "shortDescription" text`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "description" text`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "videoUrl" text`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "projectType" text`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "editorialLabel" character varying`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "category" character varying`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "deliveryTime" character varying`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "duration" character varying`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "timezone" character varying`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "location" character varying`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "createdBy" character varying`);

    // Numeric columns
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "priceMin" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "priceMax" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "estimatedHours" integer`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "rating" numeric(3,1) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "reviewCount" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "completionsCount" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "views90d" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "adminBoost" numeric NOT NULL DEFAULT 0`);

    // Boolean flags
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "chatEnabled" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "reportButtonEnabled" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "shareButtonEnabled" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "helpButtonEnabled" boolean NOT NULL DEFAULT false`);

    // Array columns
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "subcategories" text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "programmingLanguages" text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "developmentTech" text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "languages" text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "locations" text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "mediaUrls" text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "relatedProjectIds" text[] NOT NULL DEFAULT '{}'`);

    // JSONB columns
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "faqs" jsonb NOT NULL DEFAULT '[]'`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "recentQuestions" jsonb NOT NULL DEFAULT '[]'`);
    await queryRunner.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS "categorySelections" jsonb NOT NULL DEFAULT '[]'`);

    // Unique index for payloadId
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'listings' AND tablename = 'project' AND indexname = 'UQ_project_payloadId') THEN
          CREATE UNIQUE INDEX "UQ_project_payloadId" ON "listings"."project" ("payloadId") WHERE "payloadId" IS NOT NULL;
        END IF;
      END $$;
    `);

    // Unique index for slug
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'listings' AND tablename = 'project' AND indexname = 'UQ_project_slug') THEN
          CREATE UNIQUE INDEX "UQ_project_slug" ON "listings"."project" ("slug") WHERE "slug" IS NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: column additions are non-destructive
  }
}
