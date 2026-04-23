import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitListingsSchema1762484000000 implements MigrationInterface {
  name = 'InitListingsSchema1762484000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "payloadId" character varying,
        "title" character varying(120) NOT NULL,
        "shortDescription" character varying,
        "description" character varying,
        "category" character varying,
        "categories" character varying[] NOT NULL DEFAULT '{}'::character varying[],
        "subcategories" character varying[] NOT NULL DEFAULT '{}'::character varying[],
        "industries" character varying[] NOT NULL DEFAULT '{}'::character varying[],
        "tags" character varying[] NOT NULL DEFAULT '{}'::character varying[],
        "skills" character varying[] NOT NULL DEFAULT '{}'::character varying[],
        "programmingLanguages" character varying[] NOT NULL DEFAULT '{}'::character varying[],
        "developmentTech" character varying[] NOT NULL DEFAULT '{}'::character varying[],
        "mediaUrls" character varying[] NOT NULL DEFAULT '{}'::character varying[],
        "videoUrl" character varying,
        "deliverables" jsonb,
        "faqs" jsonb,
        "scope" jsonb,
        "estimatedHours" integer,
        "status" character varying DEFAULT 'draft',
        "budget" numeric,
        "duration" character varying,
        "pricingModel" character varying,
        "priceViewMode" character varying,
        "priceMax" numeric,
        "projectType" character varying,
        "klarnaEnabled" boolean DEFAULT false,
        "recentQuestions" jsonb,
        "skillsAndTools" jsonb,
        "reportButtonEnabled" boolean DEFAULT true,
        "shareButtonEnabled" boolean DEFAULT true,
        "helpButtonEnabled" boolean DEFAULT false,
        "relatedProjectIds" character varying[] NOT NULL DEFAULT '{}'::character varying[],
        "rating" numeric DEFAULT 0,
        "reviewCount" integer DEFAULT 0,
        "completionsCount" integer DEFAULT 0,
        "views90d" integer DEFAULT 0,
        "adminBoost" numeric DEFAULT 0,
        "featured" boolean DEFAULT false,
        "createdBy" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "phase" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "phaseName" character varying(255) NOT NULL,
        "stageName" character varying(255),
        "startDay" integer,
        "endDay" integer,
        "order" integer,
        "projectId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_phase_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "role" character varying(255) NOT NULL,
        "location" text[] NOT NULL DEFAULT '{}'::text[],
        "experience" text[] NOT NULL DEFAULT '{}'::text[],
        "experienceLevel" character varying(255) NOT NULL,
        "estimatedHours" integer,
        "duration" character varying NOT NULL,
        "phaseId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_task_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "featuredImage" character varying NOT NULL,
        "additionalImages" character varying[],
        "videoUrl" character varying,
        "projectId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_media_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_phase_project'
        ) THEN
          ALTER TABLE "phase"
          ADD CONSTRAINT "FK_phase_project"
          FOREIGN KEY ("projectId") REFERENCES "projects"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_task_phase'
        ) THEN
          ALTER TABLE "task"
          ADD CONSTRAINT "FK_task_phase"
          FOREIGN KEY ("phaseId") REFERENCES "phase"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_media_project'
        ) THEN
          ALTER TABLE "media"
          ADD CONSTRAINT "FK_media_project"
          FOREIGN KEY ("projectId") REFERENCES "projects"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_projects_id" ON "projects" ("id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_projects_title" ON "projects" ("title")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_phase_id" ON "phase" ("id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_id" ON "task" ("id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_media_id" ON "media" ("id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_media_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_phase_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_title"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_id"`);

    await queryRunner.query(`ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "FK_media_project"`);
    await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "FK_task_phase"`);
    await queryRunner.query(`ALTER TABLE "phase" DROP CONSTRAINT IF EXISTS "FK_phase_project"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "media"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "phase"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
  }
}
