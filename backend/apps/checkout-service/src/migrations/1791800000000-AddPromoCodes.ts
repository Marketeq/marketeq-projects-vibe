import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromoCodes1791800000000 implements MigrationInterface {
  name = 'AddPromoCodes1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "checkout"."promo_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" text NOT NULL,
        "discount_type" character varying NOT NULL,
        "discount_value" numeric(12,2) NOT NULL,
        "applies_to" character varying NOT NULL DEFAULT 'project',
        "period_scope" character varying NOT NULL DEFAULT 'total',
        "period_count" integer,
        "starts_at" TIMESTAMP WITH TIME ZONE,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "max_redemptions" integer,
        "max_per_client" integer,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promo_codes_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_promo_codes_discount" CHECK (
          ("discount_type" = 'percent' AND "discount_value" BETWEEN 0 AND 100)
          OR ("discount_type" = 'fixed' AND "discount_value" > 0)
        ),
        CONSTRAINT "CHK_promo_codes_applies_to" CHECK ("applies_to" IN ('project', 'service', 'both')),
        CONSTRAINT "CHK_promo_codes_period_scope" CHECK ("period_scope" IN ('total', 'first_n_periods', 'every_period')),
        CONSTRAINT "CHK_promo_codes_window" CHECK ("starts_at" IS NULL OR "expires_at" IS NULL OR "expires_at" > "starts_at"),
        CONSTRAINT "CHK_promo_codes_caps" CHECK (
          ("max_redemptions" IS NULL OR "max_redemptions" > 0)
          AND ("max_per_client" IS NULL OR "max_per_client" > 0)
          AND ("period_count" IS NULL OR "period_count" > 0)
        )
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_promo_codes_code"
        ON "checkout"."promo_codes" (upper(trim("code")))
    `);
    await queryRunner.query(`
      CREATE TABLE "checkout"."promo_redemptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "promo_code_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "draft_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "discount_amount" numeric(12,2) NOT NULL,
        "redeemed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "voided_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_promo_redemptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_promo_redemptions_order" UNIQUE ("order_id"),
        CONSTRAINT "FK_promo_redemptions_promo_code" FOREIGN KEY ("promo_code_id")
          REFERENCES "checkout"."promo_codes"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_redemptions_caps"
        ON "checkout"."promo_redemptions" ("promo_code_id", "client_id")
        WHERE "voided_at" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts"
        ADD COLUMN "promoCode" uuid,
        ADD CONSTRAINT "FK_drafts_promo_code" FOREIGN KEY ("promoCode")
          REFERENCES "checkout"."promo_codes"("id") ON DELETE RESTRICT,
        DROP COLUMN "promoCodes"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
        ADD COLUMN "appliedPromoCode" uuid,
        ADD CONSTRAINT "FK_sessions_promo_code" FOREIGN KEY ("appliedPromoCode")
          REFERENCES "checkout"."promo_codes"("id") ON DELETE RESTRICT,
        DROP COLUMN "appliedPromos"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
        ADD COLUMN "appliedPromos" jsonb
    `);
    await queryRunner.query(`
      UPDATE "checkout"."sessions" s
      SET "appliedPromos" = jsonb_build_array(jsonb_build_object('code', p."code", 'discountAmount', 0))
      FROM "checkout"."promo_codes" p
      WHERE s."appliedPromoCode" = p."id"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
        DROP CONSTRAINT "FK_sessions_promo_code",
        DROP COLUMN "appliedPromoCode"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts"
        ADD COLUMN "promoCodes" text[] NOT NULL DEFAULT '{}'
    `);
    await queryRunner.query(`
      UPDATE "checkout"."drafts" d
      SET "promoCodes" = ARRAY[p."code"]
      FROM "checkout"."promo_codes" p
      WHERE d."promoCode" = p."id"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts"
        DROP CONSTRAINT "FK_drafts_promo_code",
        DROP COLUMN "promoCode"
    `);
    await queryRunner.query(`DROP TABLE "checkout"."promo_redemptions"`);
    await queryRunner.query(`DROP TABLE "checkout"."promo_codes"`);
  }
}
