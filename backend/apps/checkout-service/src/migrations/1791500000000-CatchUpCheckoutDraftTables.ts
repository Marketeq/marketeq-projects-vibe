import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE_RENAMES: [string, string][] = [
  ['checkout_drafts', 'drafts'],
  ['checkout_draft_phases', 'draft_phases'],
  ['checkout_draft_tasks', 'draft_tasks'],
  ['checkout_sessions', 'sessions'],
];

const ENUM_RENAMES: [string, string][] = [
  ['checkout_sessions_status_enum', 'sessions_status_enum'],
  ['checkout_sessions_paymentmethod_enum', 'sessions_paymentmethod_enum'],
  ['checkout_sessions_installmentplan_enum', 'sessions_installmentplan_enum'],
];

const CONSTRAINT_RENAMES: [string, string, string][] = [
  ['drafts', 'PK_checkout_drafts_id', 'PK_drafts_id'],
  ['drafts', 'UQ_checkout_drafts_client_listing', 'UQ_drafts_client_listing'],
  ['drafts', 'FK_checkout_drafts_session', 'FK_drafts_session'],
  ['draft_phases', 'PK_checkout_draft_phases_id', 'PK_draft_phases_id'],
  [
    'draft_phases',
    'UQ_checkout_draft_phases_draft_order',
    'UQ_draft_phases_draft_order',
  ],
  [
    'draft_phases',
    'FK_checkout_draft_phases_draft',
    'FK_draft_phases_draft',
  ],
  ['draft_tasks', 'PK_checkout_draft_tasks_id', 'PK_draft_tasks_id'],
  ['draft_tasks', 'FK_checkout_draft_tasks_phase', 'FK_draft_tasks_phase'],
];

const INDEX_RENAMES: [string, string][] = [
  ['IDX_checkout_drafts_sessionId', 'IDX_drafts_sessionId'],
  ['IDX_checkout_draft_tasks_phaseId', 'IDX_draft_tasks_phaseId'],
];

export class CatchUpCheckoutDraftTables1791500000000
  implements MigrationInterface
{
  name = 'CatchUpCheckoutDraftTables1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [from, to] of TABLE_RENAMES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('checkout."${from}"') IS NOT NULL
             AND to_regclass('checkout."${to}"') IS NULL THEN
            ALTER TABLE "checkout"."${from}" RENAME TO "${to}";
          END IF;
        END $$;
      `);
    }

    for (const [from, to] of ENUM_RENAMES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regtype('checkout."${from}"') IS NOT NULL
             AND to_regtype('checkout."${to}"') IS NULL THEN
            ALTER TYPE "checkout"."${from}" RENAME TO "${to}";
          END IF;
        END $$;
      `);
    }

    for (const [table, from, to] of CONSTRAINT_RENAMES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = to_regclass('checkout."${table}"')
              AND conname = '${from}'
          ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = to_regclass('checkout."${table}"')
              AND conname = '${to}'
          ) THEN
            ALTER TABLE "checkout"."${table}"
              RENAME CONSTRAINT "${from}" TO "${to}";
          END IF;
        END $$;
      `);
    }

    for (const [from, to] of INDEX_RENAMES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('checkout."${from}"') IS NOT NULL
             AND to_regclass('checkout."${to}"') IS NULL THEN
            ALTER INDEX "checkout"."${from}" RENAME TO "${to}";
          END IF;
        END $$;
      `);
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'checkout' AND table_name = 'sessions'
            AND column_name = 'projectId'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'checkout' AND table_name = 'sessions'
            AND column_name = 'listingId'
        ) THEN
          ALTER TABLE "checkout"."sessions" RENAME COLUMN "projectId" TO "listingId";
        END IF;
        IF EXISTS (SELECT 1 FROM "checkout"."sessions" WHERE "listingId" IS NULL) THEN
          RAISE EXCEPTION 'checkout.sessions has rows with no listingId';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
        ALTER COLUMN "listingId" SET NOT NULL,
        ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
        ADD COLUMN IF NOT EXISTS "appliedGiftCards" jsonb,
        ADD COLUMN IF NOT EXISTS "appliedPromos" jsonb
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'checkout' AND table_name = 'sessions'
            AND column_name = 'giftCardCode'
        ) THEN
          EXECUTE $q$
            UPDATE "checkout"."sessions"
            SET "appliedGiftCards" = jsonb_build_array(jsonb_build_object(
              'code', "giftCardCode",
              'amountUsed', "giftCardAmountUsed"))
            WHERE "giftCardCode" IS NOT NULL AND "appliedGiftCards" IS NULL
          $q$;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."sessions"
        DROP COLUMN IF EXISTS "giftCardCode",
        DROP COLUMN IF EXISTS "giftCardAmountUsed"
    `);

    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts"
        ADD COLUMN IF NOT EXISTS "memberUserIds" uuid[] NOT NULL DEFAULT '{}'
    `);
    await queryRunner.query(`
      UPDATE "checkout"."drafts" d
      SET "memberUserIds" = COALESCE((
        SELECT array_agg(DISTINCT t."assigneeUserId")
        FROM "checkout"."draft_phases" p
        JOIN "checkout"."draft_tasks" t ON t."phaseId" = p.id
        WHERE p."draftId" = d.id AND t."assigneeUserId" IS NOT NULL
      ), '{}')
      WHERE cardinality(d."memberUserIds") = 0
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts"
        DROP COLUMN IF EXISTS "phases",
        DROP COLUMN IF EXISTS "projectCost",
        DROP COLUMN IF EXISTS "sourceListingUpdatedAt",
        DROP COLUMN IF EXISTS "durationDays",
        DROP COLUMN IF EXISTS "teamMemberCount"
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'checkout' AND table_name = 'drafts'
            AND column_name = 'lastOpenedAt'
        ) THEN
          ALTER TABLE "checkout"."drafts"
            ADD COLUMN "lastOpenedAt" TIMESTAMP NOT NULL DEFAULT now();
          UPDATE "checkout"."drafts" SET "lastOpenedAt" = "updatedAt";
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."draft_phases"
        DROP COLUMN IF EXISTS "sourcePhaseId",
        DROP COLUMN IF EXISTS "isDraftOverride"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."draft_tasks"
        DROP COLUMN IF EXISTS "sourceTaskId",
        DROP COLUMN IF EXISTS "isDraftOverride"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts" DROP COLUMN IF EXISTS "lastOpenedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts"
        ADD COLUMN IF NOT EXISTS "durationDays" integer,
        ADD COLUMN IF NOT EXISTS "teamMemberCount" integer
    `);
    await queryRunner.query(`
      UPDATE "checkout"."drafts" d
      SET "teamMemberCount" = cardinality(d."memberUserIds"),
          "durationDays" = (
            SELECT MAX(p."endDay") FROM "checkout"."draft_phases" p
            WHERE p."draftId" = d.id
              AND EXISTS (SELECT 1 FROM "checkout"."draft_tasks" t WHERE t."phaseId" = p.id)
          )
    `);
  }
}
