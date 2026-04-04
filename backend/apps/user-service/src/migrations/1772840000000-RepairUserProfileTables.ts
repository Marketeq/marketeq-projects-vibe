import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairUserProfileTables1772840000000
  implements MigrationInterface
{
  name = 'RepairUserProfileTables1772840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Ensure experiences exists with the current expected shape.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "experiences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" character varying,
        "company" character varying NOT NULL,
        "location" text,
        "startDate" date NOT NULL,
        "endDate" date,
        "isCurrentRole" boolean NOT NULL DEFAULT false,
        "industryType" character varying,
        "skills" text array,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_884f0913a63882712ea578e7c85" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "industryType" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "skills" text array`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );

    // Normalize legacy scalar "skills" column to text[] if needed.
    await queryRunner.query(`
      DO $$
      DECLARE
        skills_type text;
      BEGIN
        SELECT c.udt_name
        INTO skills_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'skills';

        IF skills_type IN ('text', 'varchar', 'bpchar') THEN
          ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "skills_tmp" text[];
          EXECUTE 'UPDATE "experiences" SET "skills_tmp" = CASE WHEN "skills" IS NULL OR btrim("skills"::text) = '''' THEN NULL ELSE ARRAY["skills"::text] END';
          ALTER TABLE "experiences" DROP COLUMN "skills";
          ALTER TABLE "experiences" RENAME COLUMN "skills_tmp" TO "skills";
        ELSIF skills_type = '_varchar' THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "skills"
          TYPE text[]
          USING "skills"::text[];
        END IF;
      END $$;
    `);

    // Normalize legacy timestamp start/end dates to date if needed.
    await queryRunner.query(`
      DO $$
      DECLARE
        start_type text;
        end_type text;
      BEGIN
        SELECT c.udt_name INTO start_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'startDate';

        IF start_type IN ('timestamp', 'timestamptz') THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "startDate" TYPE date USING "startDate"::date;
        END IF;

        SELECT c.udt_name INTO end_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'endDate';

        IF end_type IN ('timestamp', 'timestamptz') THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "endDate" TYPE date USING "endDate"::date;
        END IF;
      END $$;
    `);

    // Ensure related profile tables exist in environments where prior migrations were partial.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "industries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "industry" character varying NOT NULL,
        "yearsOfExperience" integer,
        "description" text,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_f1626dcb2d58142d7dfcca7b8d1" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "languages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "fluency" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_b517f827ca496b29f4d549c631d" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "certifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "issuer" character varying NOT NULL,
        "issueDate" date NOT NULL,
        "expirationDate" date,
        "credentialId" character varying,
        "credentialUrl" character varying,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fd763d412e4a1fb1b6dadd6e72b" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "portfolio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "url" character varying,
        "imageUrl" character varying,
        "tags" text array,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_6936bb92ca4b7cda0ff28794e48" PRIMARY KEY ("id")
      )
    `);

    // Reconcile foreign keys safely.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_experiences_user_repair'
        ) THEN
          ALTER TABLE "experiences"
          ADD CONSTRAINT "FK_experiences_user_repair"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_industries_user_repair'
        ) THEN
          ALTER TABLE "industries"
          ADD CONSTRAINT "FK_industries_user_repair"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_languages_user_repair'
        ) THEN
          ALTER TABLE "languages"
          ADD CONSTRAINT "FK_languages_user_repair"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_certifications_user_repair'
        ) THEN
          ALTER TABLE "certifications"
          ADD CONSTRAINT "FK_certifications_user_repair"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_portfolio_user_repair'
        ) THEN
          ALTER TABLE "portfolio"
          ADD CONSTRAINT "FK_portfolio_user_repair"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  // Forward-only repair migration (no destructive rollback).
  public async down(): Promise<void> {
    return;
  }
}
