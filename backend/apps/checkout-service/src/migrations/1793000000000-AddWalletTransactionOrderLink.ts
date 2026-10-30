import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletTransactionOrderLink1793000000000
  implements MigrationInterface
{
  name = 'AddWalletTransactionOrderLink1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "checkout"."wallet_transactions_type_enum"
      ADD VALUE IF NOT EXISTS 'refund'
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."wallet_transactions"
      ADD COLUMN "orderId" character varying(14) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."wallet_transactions"
      ADD CONSTRAINT "FK_wallet_transactions_order"
      FOREIGN KEY ("orderId") REFERENCES "checkout"."orders"("orderId")
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_wallet_transactions_orderId"
      ON "checkout"."wallet_transactions" ("orderId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "checkout"."IDX_wallet_transactions_orderId"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."wallet_transactions"
      DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_order"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."wallet_transactions"
      DROP COLUMN IF EXISTS "orderId"
    `);
  }
}
