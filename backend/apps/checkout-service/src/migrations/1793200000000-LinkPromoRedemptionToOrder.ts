import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkPromoRedemptionToOrder1793200000000
  implements MigrationInterface
{
  name = 'LinkPromoRedemptionToOrder1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."promo_redemptions"
      ALTER COLUMN "order_id" TYPE character varying(14) USING "order_id"::text
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."promo_redemptions"
      ADD CONSTRAINT "FK_promo_redemptions_order"
      FOREIGN KEY ("order_id") REFERENCES "checkout"."orders"("orderId")
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."promo_redemptions"
      DROP CONSTRAINT IF EXISTS "FK_promo_redemptions_order"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."promo_redemptions"
      ALTER COLUMN "order_id" TYPE uuid USING "order_id"::uuid
    `);
  }
}
