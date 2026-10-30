import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGiftCardRedemptions1793100000000
  implements MigrationInterface
{
  name = 'CreateGiftCardRedemptions1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "checkout"."gift_card_redemptions_type_enum"
      AS ENUM ('payment', 'refund')
    `);
    await queryRunner.query(`
      CREATE TYPE "checkout"."gift_card_redemptions_status_enum"
      AS ENUM ('pending', 'completed')
    `);
    await queryRunner.query(`
      CREATE TABLE "checkout"."gift_card_redemptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "giftCardId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "type" "checkout"."gift_card_redemptions_type_enum" NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "status" "checkout"."gift_card_redemptions_status_enum" NOT NULL DEFAULT 'pending',
        "orderId" character varying(14) NOT NULL,
        "reason" text,
        "sourceIp" text,
        "userAgent" text,
        "createdBy" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gift_card_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_gift_card_redemptions_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_gift_card_redemptions_gift_card" FOREIGN KEY ("giftCardId")
          REFERENCES "checkout"."gift_cards"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_gift_card_redemptions_order" FOREIGN KEY ("orderId")
          REFERENCES "checkout"."orders"("orderId") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_gift_card_redemptions_giftCardId"
      ON "checkout"."gift_card_redemptions" ("giftCardId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_gift_card_redemptions_userId"
      ON "checkout"."gift_card_redemptions" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_gift_card_redemptions_orderId"
      ON "checkout"."gift_card_redemptions" ("orderId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "checkout"."gift_card_redemptions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkout"."gift_card_redemptions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkout"."gift_card_redemptions_type_enum"`);
  }
}
