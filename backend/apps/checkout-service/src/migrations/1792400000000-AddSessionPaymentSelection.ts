import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionPaymentSelection1792400000000 implements MigrationInterface {
  name = 'AddSessionPaymentSelection1792400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
      ADD COLUMN IF NOT EXISTS "paymentSelectionId" uuid NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
      DROP COLUMN IF EXISTS "paymentSelectionId"
    `);
  }
}
