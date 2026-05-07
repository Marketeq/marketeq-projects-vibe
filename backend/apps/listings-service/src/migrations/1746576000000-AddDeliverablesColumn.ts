import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliverablesColumn1746576000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "deliverables" jsonb DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "description" text DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "deliverables"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" DROP COLUMN IF EXISTS "description"`,
    );
  }
}
