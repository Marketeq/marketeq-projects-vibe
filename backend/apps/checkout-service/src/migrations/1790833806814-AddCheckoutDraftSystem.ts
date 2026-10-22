import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckoutDraftSystem1790833806814 implements MigrationInterface {
  name = 'AddCheckoutDraftSystem1790833806814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "checkout"."checkout_sessions_status_enum" ADD VALUE IF NOT EXISTS 'expired'`,
    );
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_sessions"
        ADD COLUMN "appliedGiftCards" jsonb,
        ADD COLUMN "appliedPromos" jsonb
    `);
    await queryRunner.query(`
      UPDATE "checkout"."checkout_sessions"
      SET "appliedGiftCards" = jsonb_build_array(jsonb_build_object('code', "giftCardCode", 'amountUsed', "giftCardAmountUsed"))
      WHERE "giftCardCode" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_sessions"
        DROP COLUMN "giftCardCode",
        DROP COLUMN "giftCardAmountUsed"
    `);

    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_drafts"
        DROP COLUMN "phases",
        DROP COLUMN "projectCost",
        ADD COLUMN "version" integer NOT NULL DEFAULT 1,
        ADD COLUMN "sourceListingUpdatedAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN "title" character varying,
        ADD COLUMN "mediaUrl" text,
        ADD COLUMN "durationDays" integer,
        ADD COLUMN "teamMemberCount" integer,
        ADD COLUMN "giftCardCodes" text[] NOT NULL DEFAULT '{}',
        ADD COLUMN "promoCodes" text[] NOT NULL DEFAULT '{}',
        ADD COLUMN "sessionId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_drafts"
        ADD CONSTRAINT "FK_checkout_drafts_session"
        FOREIGN KEY ("sessionId") REFERENCES "checkout"."checkout_sessions"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_drafts_sessionId" ON "checkout"."checkout_drafts" ("sessionId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "checkout"."checkout_draft_phases" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "draftId" uuid NOT NULL,
        "sourcePhaseId" character varying,
        "title" character varying NOT NULL,
        "order" integer NOT NULL,
        "startDay" integer NOT NULL DEFAULT 1,
        "endDay" integer NOT NULL DEFAULT 1,
        "isDraftOverride" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checkout_draft_phases_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_checkout_draft_phases_draft_order" UNIQUE ("draftId", "order") DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT "FK_checkout_draft_phases_draft" FOREIGN KEY ("draftId")
          REFERENCES "checkout"."checkout_drafts"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "checkout"."checkout_draft_tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "phaseId" uuid NOT NULL,
        "sourceTaskId" character varying,
        "title" character varying NOT NULL,
        "roleName" character varying,
        "location" text[] NOT NULL DEFAULT '{}',
        "experienceLevel" character varying,
        "durationHours" integer,
        "assigneeUserId" uuid,
        "order" integer NOT NULL,
        "isDraftOverride" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checkout_draft_tasks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_checkout_draft_tasks_phase" FOREIGN KEY ("phaseId")
          REFERENCES "checkout"."checkout_draft_phases"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_draft_tasks_phaseId" ON "checkout"."checkout_draft_tasks" ("phaseId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "checkout"."checkout_draft_tasks"`);
    await queryRunner.query(`DROP TABLE "checkout"."checkout_draft_phases"`);
    await queryRunner.query(`DROP INDEX "checkout"."IDX_checkout_drafts_sessionId"`);
    await queryRunner.query(
      `ALTER TABLE "checkout"."checkout_drafts" DROP CONSTRAINT "FK_checkout_drafts_session"`,
    );
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_drafts"
        DROP COLUMN "sessionId",
        DROP COLUMN "promoCodes",
        DROP COLUMN "giftCardCodes",
        DROP COLUMN "teamMemberCount",
        DROP COLUMN "durationDays",
        DROP COLUMN "mediaUrl",
        DROP COLUMN "title",
        DROP COLUMN "sourceListingUpdatedAt",
        DROP COLUMN "version",
        ADD COLUMN "phases" jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN "projectCost" numeric(10,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_sessions"
        ADD COLUMN "giftCardAmountUsed" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN "giftCardCode" character varying
    `);
    await queryRunner.query(`
      UPDATE "checkout"."checkout_sessions"
      SET "giftCardCode" = "appliedGiftCards"->0->>'code',
          "giftCardAmountUsed" = COALESCE(("appliedGiftCards"->0->>'amountUsed')::numeric, 0)
      WHERE jsonb_typeof("appliedGiftCards") = 'array' AND jsonb_array_length("appliedGiftCards") > 0
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_sessions"
        DROP COLUMN "appliedPromos",
        DROP COLUMN "appliedGiftCards"
    `);
  }
}
