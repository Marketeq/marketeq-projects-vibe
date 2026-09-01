import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaseStudyCoverImageOffsetColumns1787712190669 implements MigrationInterface {
  name = 'AddCaseStudyCoverImageOffsetColumns1787712190669';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "case_studies"
      ADD COLUMN IF NOT EXISTS "coverImageOffsetX" float NOT NULL DEFAULT 50,
      ADD COLUMN IF NOT EXISTS "coverImageOffsetY" float NOT NULL DEFAULT 50
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "case_studies"
      DROP COLUMN IF EXISTS "coverImageOffsetX",
      DROP COLUMN IF EXISTS "coverImageOffsetY"
    `);
  }
}
