import { MigrationInterface, QueryRunner } from 'typeorm';

// Restores the columns the dev-main entities still map, after the unmerged
// PMCM-216 migration AddCheckoutDraftSystem1790833806814 was applied to the
// shared staging database. It dropped checkout_drafts."phases"/"projectCost"
// and checkout_sessions."giftCardCode"/"giftCardAmountUsed", so every
// GET /checkout/listings/:id/summary 500s with
// "column CheckoutDraft.phases does not exist".
//
// Every statement is a no-op on a database that never ran that migration.
// checkout-service boots with migrationsRun, so a failure here would stop the
// service from starting; nothing in this file is allowed to throw on an
// unexpected schema.
//
// The timestamp deliberately sorts before 1790833806814. Once PMCM-216 merges,
// a fresh database runs this (no-op) first and that branch's DROP COLUMNs
// after it, so its intended end state is unchanged.
export class RestoreCheckoutDraftColumns1790000000000
  implements MigrationInterface
{
  name = 'RestoreCheckoutDraftColumns1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'checkout.checkout_drafts')) {
      await queryRunner.query(`
        ALTER TABLE "checkout"."checkout_drafts"
          ADD COLUMN IF NOT EXISTS "phases" jsonb NOT NULL DEFAULT '[]',
          ADD COLUMN IF NOT EXISTS "projectCost" numeric(10,2)
      `);
    }

    if (await this.tableExists(queryRunner, 'checkout.checkout_sessions')) {
      await queryRunner.query(`
        ALTER TABLE "checkout"."checkout_sessions"
          ADD COLUMN IF NOT EXISTS "giftCardCode" character varying,
          ADD COLUMN IF NOT EXISTS "giftCardAmountUsed" numeric(10,2) NOT NULL DEFAULT 0
      `);

      // That migration moved each session's gift card into "appliedGiftCards"
      // before dropping the columns. Copy it back the same way its own down()
      // does, with the casts guarded per row (CASE, since Postgres does not
      // short-circuit AND) so one malformed row cannot block the rest. Any
      // remaining failure is downgraded to a warning instead of a failed boot.
      const movedGiftCards = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'checkout'
          AND table_name = 'checkout_sessions'
          AND column_name = 'appliedGiftCards'
      `);
      if (movedGiftCards.length > 0) {
        await queryRunner.query(`
          DO $$
          BEGIN
            UPDATE "checkout"."checkout_sessions"
            SET "giftCardCode" = "appliedGiftCards"->0->>'code',
                "giftCardAmountUsed" = CASE
                  WHEN ("appliedGiftCards"->0->>'amountUsed') ~ '^-?[0-9]+(\\.[0-9]+)?$'
                    THEN ROUND(("appliedGiftCards"->0->>'amountUsed')::numeric, 2)
                  ELSE 0
                END
            WHERE "giftCardCode" IS NULL
              AND CASE
                WHEN jsonb_typeof("appliedGiftCards") = 'array'
                  THEN jsonb_typeof("appliedGiftCards"->0) = 'object'
                    AND ("appliedGiftCards"->0->>'code') IS NOT NULL
                ELSE false
              END;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'RestoreCheckoutDraftColumns: gift card backfill skipped: %', SQLERRM;
          END $$
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op — these columns belong to the entities and to the migrations that
    // first created them; dropping them here would break dev-main again.
  }

  private async tableExists(
    queryRunner: QueryRunner,
    qualifiedName: string,
  ): Promise<boolean> {
    const [row] = await queryRunner.query(
      `SELECT to_regclass($1) IS NOT NULL AS "exists"`,
      [qualifiedName],
    );
    return row?.exists === true;
  }
}
