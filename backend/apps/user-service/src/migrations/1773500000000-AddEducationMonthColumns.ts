import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEducationMonthColumns1773500000000
  implements MigrationInterface
{
  name = 'AddEducationMonthColumns1773500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "educations"
      ADD COLUMN IF NOT EXISTS "startMonth" integer,
      ADD COLUMN IF NOT EXISTS "endMonth" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "educations" DROP COLUMN IF EXISTS "startMonth"`);
    await queryRunner.query(`ALTER TABLE "educations" DROP COLUMN IF EXISTS "endMonth"`);
  }
}
