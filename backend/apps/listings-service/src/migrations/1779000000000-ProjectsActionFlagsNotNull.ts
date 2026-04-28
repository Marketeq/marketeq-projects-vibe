import { MigrationInterface, QueryRunner } from "typeorm";

export class ProjectsActionFlagsNotNull1779000000000
  implements MigrationInterface
{
  name = "ProjectsActionFlagsNotNull1779000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure UI action flags exist, are non-nullable, and have stable defaults.
    // These are consumed by the public read adapter (cms-projects.controller)
    // without fallbacks.
    await queryRunner.query(`
      ALTER TABLE public."projects"
        ADD COLUMN IF NOT EXISTS "chatEnabled" boolean;
    `);
    await queryRunner.query(`
      ALTER TABLE public."projects"
        ADD COLUMN IF NOT EXISTS "reportButtonEnabled" boolean;
    `);
    await queryRunner.query(`
      ALTER TABLE public."projects"
        ADD COLUMN IF NOT EXISTS "shareButtonEnabled" boolean;
    `);
    await queryRunner.query(`
      ALTER TABLE public."projects"
        ADD COLUMN IF NOT EXISTS "helpButtonEnabled" boolean;
    `);

    // Backfill nulls (or previously missing values) before enforcing NOT NULL.
    await queryRunner.query(
      `UPDATE public."projects" SET "chatEnabled" = false WHERE "chatEnabled" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE public."projects" SET "reportButtonEnabled" = true WHERE "reportButtonEnabled" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE public."projects" SET "shareButtonEnabled" = true WHERE "shareButtonEnabled" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE public."projects" SET "helpButtonEnabled" = false WHERE "helpButtonEnabled" IS NULL`,
    );

    // Defaults for future rows.
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "chatEnabled" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "reportButtonEnabled" SET DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "shareButtonEnabled" SET DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "helpButtonEnabled" SET DEFAULT false`,
    );

    // Enforce non-nullability.
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "chatEnabled" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "reportButtonEnabled" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "shareButtonEnabled" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "helpButtonEnabled" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to nullable columns without defaults (keep columns to avoid data loss).
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "chatEnabled" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "reportButtonEnabled" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "shareButtonEnabled" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "helpButtonEnabled" DROP NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "chatEnabled" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "reportButtonEnabled" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "shareButtonEnabled" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE public."projects" ALTER COLUMN "helpButtonEnabled" DROP DEFAULT`,
    );
  }
}

