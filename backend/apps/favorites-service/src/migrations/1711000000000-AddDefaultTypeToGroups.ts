import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDefaultTypeToGroups1711000000000 implements MigrationInterface {
  name = "AddDefaultTypeToGroups1711000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "favorite_groups"
      ADD COLUMN IF NOT EXISTS "defaultType" varchar(20) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "favorite_groups" DROP COLUMN IF EXISTS "defaultType"
    `);
  }
}
