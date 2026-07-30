import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKlarnaPaymentMethod1784313936757 implements MigrationInterface {
  name = 'AddKlarnaPaymentMethod1784313936757';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "checkout"."checkout_sessions_paymentmethod_enum" ADD VALUE IF NOT EXISTS 'klarna'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL cannot safely remove an enum value in place. Leaving `klarna`
    // available is backward-compatible if this application change is reverted.
  }
}
