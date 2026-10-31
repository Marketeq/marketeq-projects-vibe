import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderPaymentDetailsSnapshot1793300000000
  implements MigrationInterface
{
  name = 'AddOrderPaymentDetailsSnapshot1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."orders"
      ADD COLUMN "paymentDetailsSnapshot" jsonb NULL
    `);
    await queryRunner.query(`
      UPDATE "checkout"."orders" o
      SET "paymentDetailsSnapshot" = jsonb_build_object(
        'projectCost', s."projectCost",
        'tax', 0,
        'promo', (
          SELECT jsonb_build_object(
            'code', c."code",
            'type', c."discount_type",
            'value', c."discount_value",
            'amount', r."discount_amount"
          )
          FROM "checkout"."promo_redemptions" r
          JOIN "checkout"."promo_codes" c ON c."id" = r."promo_code_id"
          WHERE r."order_id" = o."orderId" AND r."voided_at" IS NULL
          LIMIT 1
        ),
        'giftCards', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('code', gc."code", 'amount', g."amount")
            ORDER BY g."createdAt"
          )
          FROM "checkout"."gift_card_redemptions" g
          JOIN "checkout"."gift_cards" gc ON gc."id" = g."giftCardId"
          WHERE g."orderId" = o."orderId" AND g."type" = 'payment'
        ), '[]'::jsonb),
        'balanceApplied', COALESCE((
          SELECT SUM(w."amount")
          FROM "checkout"."wallet_transactions" w
          WHERE w."orderId" = o."orderId" AND w."type" = 'payment'
        ), 0),
        'total', o."orderCost",
        'capturedAt', o."createdAt"
      )
      FROM "checkout"."sessions" s
      WHERE s."id" = o."sessionId"
    `);
    await queryRunner.query(`
      CREATE FUNCTION "checkout"."orders_payment_details_snapshot_readonly"()
      RETURNS trigger AS $$
      BEGIN
        IF OLD."paymentDetailsSnapshot" IS NOT NULL
          AND NEW."paymentDetailsSnapshot" IS DISTINCT FROM OLD."paymentDetailsSnapshot" THEN
          RAISE EXCEPTION 'orders.paymentDetailsSnapshot is read only once set'
            USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "orders_payment_details_snapshot_readonly"
      BEFORE UPDATE ON "checkout"."orders"
      FOR EACH ROW
      EXECUTE FUNCTION "checkout"."orders_payment_details_snapshot_readonly"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "orders_payment_details_snapshot_readonly"
      ON "checkout"."orders"
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS "checkout"."orders_payment_details_snapshot_readonly"()
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."orders"
      DROP COLUMN IF EXISTS "paymentDetailsSnapshot"
    `);
  }
}
