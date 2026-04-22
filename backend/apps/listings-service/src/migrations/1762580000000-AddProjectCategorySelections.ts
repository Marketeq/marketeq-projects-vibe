import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectCategorySelections1762580000000
  implements MigrationInterface
{
  name = 'AddProjectCategorySelections1762580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project"
      ADD COLUMN IF NOT EXISTS "categorySelections" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      UPDATE "project"
      SET "categorySelections" = '[]'::jsonb
      WHERE "categorySelections" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project"
      DROP COLUMN IF EXISTS "categorySelections"
    `);
  }
}
