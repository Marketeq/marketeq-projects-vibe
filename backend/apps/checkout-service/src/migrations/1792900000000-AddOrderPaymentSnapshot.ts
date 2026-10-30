import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderPaymentSnapshot1792900000000
  implements MigrationInterface
{
  name = 'AddOrderPaymentSnapshot1792900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."orders"
      ADD COLUMN "paymentSnapshot" jsonb NULL
    `);
    await queryRunner.query(`
      CREATE FUNCTION "checkout"."orders_payment_snapshot_readonly"()
      RETURNS trigger AS $$
      BEGIN
        IF OLD."paymentSnapshot" IS NOT NULL
          AND NEW."paymentSnapshot" IS DISTINCT FROM OLD."paymentSnapshot" THEN
          RAISE EXCEPTION 'orders.paymentSnapshot is read only once set'
            USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "orders_payment_snapshot_readonly"
      BEFORE UPDATE ON "checkout"."orders"
      FOR EACH ROW
      EXECUTE FUNCTION "checkout"."orders_payment_snapshot_readonly"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "orders_payment_snapshot_readonly"
      ON "checkout"."orders"
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS "checkout"."orders_payment_snapshot_readonly"()
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."orders" DROP COLUMN IF EXISTS "paymentSnapshot"
    `);
  }
}
