import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPhone1776700000000 implements MigrationInterface {
  name = "AddUserPhone1776700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable("users");
    if (!hasTable) return;
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable("users");
    if (!hasTable) return;
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`,
    );
  }
}
