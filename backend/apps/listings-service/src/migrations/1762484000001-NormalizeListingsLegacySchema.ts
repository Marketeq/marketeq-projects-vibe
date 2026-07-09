import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeListingsLegacySchema1762484000001
  implements MigrationInterface
{
  name = 'NormalizeListingsLegacySchema1762484000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'project' AND column_name = 'longDescription'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'project' AND column_name = 'fullDescription'
        ) THEN
          ALTER TABLE "project" RENAME COLUMN "longDescription" TO "fullDescription";
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "strapiId" character varying`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "projectDatePublished" timestamptz`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "status" character varying`);
    await queryRunner.query(`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "subCategories" character varying[]`);
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "subCategories" SET DEFAULT '{}'::character varying[]`,
    );
    await queryRunner.query(
      `UPDATE "project" SET "subCategories" = '{}'::character varying[] WHERE "subCategories" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "subCategories" SET NOT NULL`);
    await queryRunner.query(
      `UPDATE "project" SET "status" = 'pending_review' WHERE "status" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "status" SET DEFAULT 'pending_review'`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'phase' AND column_name = 'name'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'phase' AND column_name = 'phaseName'
        ) THEN
          ALTER TABLE "phase" RENAME COLUMN "name" TO "phaseName";
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "phase" ADD COLUMN IF NOT EXISTS "phaseName" character varying(255)`);
    await queryRunner.query(
      `UPDATE "phase" SET "phaseName" = 'Untitled Phase' WHERE "phaseName" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "phase" ALTER COLUMN "phaseName" SET NOT NULL`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'taskName'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'title'
        ) THEN
          ALTER TABLE "task" RENAME COLUMN "taskName" TO "title";
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "title" character varying(255)`);
    await queryRunner.query(`UPDATE "task" SET "title" = 'Untitled Task' WHERE "title" IS NULL`);
    await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "title" SET NOT NULL`);

    await queryRunner.query(`
      DO $$
      DECLARE
        location_type text;
      BEGIN
        SELECT c.udt_name
        INTO location_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'task'
          AND c.column_name = 'location';

        IF location_type IS NULL THEN
          ALTER TABLE "task" ADD COLUMN "location" text[];
        ELSIF location_type IN ('varchar', 'bpchar', 'text') THEN
          ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "location_tmp" text[];
          EXECUTE 'UPDATE "task" SET "location_tmp" = CASE WHEN "location" IS NULL OR btrim("location"::text) = '''' THEN ''{}''::text[] ELSE ARRAY["location"::text] END';
          ALTER TABLE "task" DROP COLUMN "location";
          ALTER TABLE "task" RENAME COLUMN "location_tmp" TO "location";
        ELSIF location_type = '_varchar' THEN
          ALTER TABLE "task"
          ALTER COLUMN "location"
          TYPE text[]
          USING COALESCE("location"::text[], '{}'::text[]);
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `UPDATE "task" SET "location" = '{}'::text[] WHERE "location" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ALTER COLUMN "location" SET DEFAULT '{}'::text[]`,
    );
    await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "location" SET NOT NULL`);

    await queryRunner.query(`
      DO $$
      DECLARE
        experience_type text;
      BEGIN
        SELECT c.udt_name
        INTO experience_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'task'
          AND c.column_name = 'experience';

        IF experience_type IS NULL THEN
          ALTER TABLE "task" ADD COLUMN "experience" text[];
        ELSIF experience_type IN ('varchar', 'bpchar', 'text') THEN
          ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "experience_tmp" text[];
          EXECUTE 'UPDATE "task" SET "experience_tmp" = CASE WHEN "experience" IS NULL OR btrim("experience"::text) = '''' THEN ''{}''::text[] ELSE ARRAY["experience"::text] END';
          ALTER TABLE "task" DROP COLUMN "experience";
          ALTER TABLE "task" RENAME COLUMN "experience_tmp" TO "experience";
        ELSIF experience_type = '_varchar' THEN
          ALTER TABLE "task"
          ALTER COLUMN "experience"
          TYPE text[]
          USING COALESCE("experience"::text[], '{}'::text[]);
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `UPDATE "task" SET "experience" = '{}'::text[] WHERE "experience" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ALTER COLUMN "experience" SET DEFAULT '{}'::text[]`,
    );
    await queryRunner.query(`ALTER TABLE "task" ALTER COLUMN "experience" SET NOT NULL`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'media' AND column_name = 'featuredVideo'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'media' AND column_name = 'videoUrl'
        ) THEN
          ALTER TABLE "media" RENAME COLUMN "featuredVideo" TO "videoUrl";
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "videoUrl" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'title'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'task' AND column_name = 'taskName'
        ) THEN
          ALTER TABLE "task" RENAME COLUMN "title" TO "taskName";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'phase' AND column_name = 'phaseName'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'phase' AND column_name = 'name'
        ) THEN
          ALTER TABLE "phase" RENAME COLUMN "phaseName" TO "name";
        END IF;
      END $$;
    `);
  }
}
