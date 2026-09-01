import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaseStudyCoverImageTransformColumns1787710996685 implements MigrationInterface {
  name = 'AddCaseStudyCoverImageTransformColumns1787710996685';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "case_studies"
      ADD COLUMN IF NOT EXISTS "coverImageZoom" float NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "coverImageRotation" int NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "case_studies"
      DROP COLUMN IF EXISTS "coverImageZoom",
      DROP COLUMN IF EXISTS "coverImageRotation"
    `);
  }
}
