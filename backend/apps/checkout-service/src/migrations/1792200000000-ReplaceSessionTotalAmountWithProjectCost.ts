import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceSessionTotalAmountWithProjectCost1792200000000
  implements MigrationInterface
{
  name = 'ReplaceSessionTotalAmountWithProjectCost1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
      ADD COLUMN "projectCost" numeric(10,2)
    `);
    await queryRunner.query(`
      UPDATE "checkout"."sessions" SET "projectCost" = "totalAmount"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
      ALTER COLUMN "projectCost" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions" DROP COLUMN "totalAmount"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
      ADD COLUMN "totalAmount" numeric(10,2)
    `);
    await queryRunner.query(`
      UPDATE "checkout"."sessions" SET "totalAmount" = "projectCost"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
      ALTER COLUMN "totalAmount" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions" DROP COLUMN "projectCost"
    `);
  }
}
