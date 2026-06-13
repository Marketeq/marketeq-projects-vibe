import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAndRefColumns1717500001000 implements MigrationInterface {
  name = 'AddTaskAndRefColumns1717500001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "earnings_cache" ADD COLUMN IF NOT EXISTS "task_name" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "earnings_cache" ADD COLUMN IF NOT EXISTS "contract_ref" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "earnings_cache" ADD COLUMN IF NOT EXISTS "task_ref" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "earnings_cache" DROP COLUMN IF EXISTS "task_ref"`);
    await queryRunner.query(`ALTER TABLE "earnings_cache" DROP COLUMN IF EXISTS "contract_ref"`);
    await queryRunner.query(`ALTER TABLE "earnings_cache" DROP COLUMN IF EXISTS "task_name"`);
  }
}