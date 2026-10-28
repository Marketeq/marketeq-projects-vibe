import { MigrationInterface, QueryRunner } from 'typeorm';

export class MovePaymentFieldsOffSessions1792800000000
  implements MigrationInterface
{
  name = 'MovePaymentFieldsOffSessions1792800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "checkout"."sessions"
          WHERE "splitPaymentEnabled" = true OR "initialPaymentAmount" IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'sessions with split payment data exist, review them before running this migration';
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE "session_amounts" ON COMMIT DROP AS
      SELECT
        x."sessionId",
        x."dueBeforeBalance" - LEAST(x."wallet", x."dueBeforeBalance") AS "amount"
      FROM (
        SELECT
          s."id" AS "sessionId",
          s."walletAmountUsed" AS "wallet",
          GREATEST(
            0,
            s."projectCost"
              - CASE
                  WHEN p."id" IS NULL THEN 0
                  WHEN s."status"::text NOT IN ('success', 'refunded')
                    AND NOT (
                      p."active"
                      AND p."applies_to" <> 'service'
                      AND (p."starts_at" IS NULL OR p."starts_at" <= now())
                      AND (p."expires_at" IS NULL OR p."expires_at" >= now())
                    ) THEN 0
                  ELSE LEAST(
                    CASE p."discount_type"
                      WHEN 'percent'
                        THEN ROUND(s."projectCost" * p."discount_value" / 100, 2)
                      ELSE p."discount_value"
                    END,
                    s."projectCost"
                  )
                END
              - COALESCE(g."total", 0)
          ) AS "dueBeforeBalance"
        FROM "checkout"."sessions" s
        LEFT JOIN "checkout"."promo_codes" p ON p."id" = s."appliedPromoCode"
        LEFT JOIN LATERAL (
          SELECT SUM((e ->> 'amountUsed')::numeric) AS "total"
          FROM jsonb_array_elements(
            COALESCE(s."appliedGiftCards", '[]'::jsonb)
          ) e
        ) g ON true
      ) x
    `);

    await queryRunner.query(`
      INSERT INTO "checkout"."orders" (
        "sessionId", "clientId", "listingId", "status", "orderCost",
        "paidAt", "createdAt", "updatedAt"
      )
      SELECT
        s."id", s."clientId", s."listingId", 'paid', a."amount",
        s."updatedAt", s."createdAt", s."updatedAt"
      FROM "checkout"."sessions" s
      JOIN "session_amounts" a ON a."sessionId" = s."id"
      WHERE s."status"::text IN ('success', 'refunded')
      ORDER BY s."createdAt"
    `);

    await queryRunner.query(`
      INSERT INTO "checkout"."payments" (
        "sessionId", "phase", "method", "savedMethodId", "amount", "status",
        "stripePaymentIntentId", "createdAt", "updatedAt"
      )
      SELECT
        s."id",
        'initial',
        s."paymentMethod"::text::"checkout"."payments_method_enum",
        CASE WHEN s."paymentMethod"::text IN ('card', 'ach')
          THEN s."paymentSelectionId" END,
        a."amount",
        (CASE s."status"::text
          WHEN 'success' THEN 'paid'
          WHEN 'refunded' THEN 'paid'
          WHEN 'failed' THEN 'failed'
          ELSE 'pending'
        END)::"checkout"."payments_status_enum",
        pi."stripePaymentIntentId",
        s."createdAt",
        s."updatedAt"
      FROM "checkout"."sessions" s
      JOIN "session_amounts" a ON a."sessionId" = s."id"
      LEFT JOIN (
        SELECT t."id", t."stripePaymentIntentId"
        FROM (
          SELECT
            "id",
            "stripePaymentIntentId",
            ROW_NUMBER() OVER (
              PARTITION BY "stripePaymentIntentId" ORDER BY "createdAt"
            ) AS rn
          FROM "checkout"."sessions"
          WHERE "stripePaymentIntentId" IS NOT NULL
        ) t
        WHERE t.rn = 1
      ) pi ON pi."id" = s."id"
      WHERE a."amount" > 0
        AND (
          s."paymentSelectionId" IS NOT NULL
          OR s."paymentMethod"::text <> 'card'
          OR s."status"::text IN ('success', 'refunded')
        )
      ORDER BY s."createdAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
        DROP COLUMN "listingId",
        DROP COLUMN "paymentMethod",
        DROP COLUMN "paymentSelectionId",
        DROP COLUMN "splitPaymentEnabled",
        DROP COLUMN "initialPaymentAmount"
    `);
    await queryRunner.query(
      `DROP TYPE "checkout"."sessions_paymentmethod_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "checkout"."sessions_paymentmethod_enum"
        AS ENUM ('card', 'ach', 'wire')
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
        ADD COLUMN "listingId" character varying NULL,
        ADD COLUMN "paymentMethod" "checkout"."sessions_paymentmethod_enum"
          NOT NULL DEFAULT 'card',
        ADD COLUMN "paymentSelectionId" uuid NULL,
        ADD COLUMN "splitPaymentEnabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN "initialPaymentAmount" numeric(10,2) NULL
    `);
    await queryRunner.query(`
      UPDATE "checkout"."sessions" s
      SET "listingId" = o."listingId"
      FROM "checkout"."orders" o
      WHERE o."sessionId" = s."id"
    `);
    await queryRunner.query(`
      UPDATE "checkout"."sessions" s
      SET "listingId" = d."listingId"
      FROM "checkout"."drafts" d
      WHERE d."sessionId" = s."id" AND s."listingId" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "checkout"."sessions" SET "listingId" = 'unknown'
      WHERE "listingId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions" ALTER COLUMN "listingId" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "checkout"."sessions" s
      SET
        "paymentMethod" = p."method"::text
          ::"checkout"."sessions_paymentmethod_enum",
        "paymentSelectionId" = p."savedMethodId"
      FROM (
        SELECT DISTINCT ON ("sessionId") "sessionId", "method", "savedMethodId"
        FROM "checkout"."payments"
        WHERE "phase" = 'initial'
          AND "method"::text IN ('card', 'ach', 'wire')
        ORDER BY "sessionId", "createdAt"
      ) p
      WHERE p."sessionId" = s."id"
    `);
  }
}
