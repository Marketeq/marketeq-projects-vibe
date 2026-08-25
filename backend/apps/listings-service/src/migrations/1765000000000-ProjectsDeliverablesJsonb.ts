import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectsDeliverablesJsonb1765000000000 implements MigrationInterface {
  name = 'ProjectsDeliverablesJsonb1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Column already added as jsonb by AddDeliverablesColumn1746576000000 in listings.project.
    // public."projects" is a legacy reference — skip safely.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'deliverables'
          AND data_type <> 'jsonb'
        ) THEN
          ALTER TABLE public."projects" ALTER COLUMN "deliverables" DROP DEFAULT;
          ALTER TABLE public."projects" ALTER COLUMN "deliverables" TYPE jsonb USING to_jsonb("deliverables");
          ALTER TABLE public."projects" ALTER COLUMN "deliverables" SET DEFAULT '[]'::jsonb;
          UPDATE public."projects" SET "deliverables" = '[]'::jsonb WHERE "deliverables" IS NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public."projects"
      ALTER COLUMN "deliverables" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE public."projects"
      ALTER COLUMN "deliverables" TYPE text[]
      USING ARRAY[]::text[]
    `);
    await queryRunner.query(`
      ALTER TABLE public."projects"
      ALTER COLUMN "deliverables" SET DEFAULT '{}'::text[]
    `);
  }
}
