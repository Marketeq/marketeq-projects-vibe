import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaseStudyDetailsColumns1787664271792 implements MigrationInterface {
  name = 'AddCaseStudyDetailsColumns1787664271792';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "case_studies"
      ADD COLUMN IF NOT EXISTS "description" text,
      ADD COLUMN IF NOT EXISTS "coverImage" text,
      ADD COLUMN IF NOT EXISTS "skills" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "case_studies"
      DROP COLUMN IF EXISTS "description",
      DROP COLUMN IF EXISTS "coverImage",
      DROP COLUMN IF EXISTS "skills"
    `);
  }
}
