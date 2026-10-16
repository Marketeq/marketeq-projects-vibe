import { MigrationInterface, QueryRunner } from 'typeorm';

// Additive follow-up to ExpandIdentityVerificationStatusAndAddColumns —
// that migration is already applied and is not edited in place, matching
// this directory's existing convention.
//
// Supports the two-stage Didit integration (standalone document check,
// then a Didit-hosted biometric session using that check's portrait):
//
// 1. identity_documents gains a back-image reference (front/back capture)
//    and the standalone document-check result — status, warnings,
//    a hash of the exact image bytes submitted (so a cached result can
//    never be reused against a replaced image), and Didit's own request
//    id (needed to look the portrait back up when "Begin verifying" is
//    clicked, since that can happen well after document submission).
// 2. A new biometric_sessions table — deliberately NOT an extension of
//    pending_verification_sessions, whose columns (attempt_method,
//    attempt_document_type, vpn_proxy_detection_result) are shaped
//    around the old, now-retired hosted-Sessions-API placeholder and
//    don't fit a document-linked biometric session. One row per hosted
//    session; our own `status` is updated only by a verified webhook.
// 3. A new processed_webhook_events table for persistent, restart-safe
//    webhook deduplication (event_id is Didit's own idempotency key for
//    this envelope — see providers/webhooks/README-style header comments
//    for why this replaces the old vendor_session_id-keyed approach).
// 4. document_number / document_number_normalized / expiration_date on
//    identity_documents drop their NOT NULL constraint (from the original
//    CreateIdentityVerificationSchema migration, not edited in place). They
//    remain required at the DTO layer for captureMethod=manual_entry; for
//    captureMethod=scan they are legitimately unknown at submission time
//    and are backfilled later from Didit's own document-check extraction
//    (or left null if genuinely absent/unreadable) — see
//    SubmitDocumentRequestDto and TwoStageVerificationService's header
//    comments.
// 5. A new attempt_reservations table — a short-lived placeholder row used
//    by account-wide-attempt-count.ts's reserveAttemptSlot to make the
//    3-attempt ceiling atomic across both pipelines (closes the
//    count-then-act race a plain SELECT count() + act cannot). Rows are
//    deleted immediately after the vendor call that follows a reservation
//    resolves (success or failure); a row surviving past its TTL (a
//    crashed process, not a normal error) is simply ignored by the count,
//    never swept — see that file's own header comment.
export class AddDocumentCheckAndBiometricSession1790400000000
  implements MigrationInterface
{
  name = 'AddDocumentCheckAndBiometricSession1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "identity_verification"."document_check_status_enum" AS ENUM (
        'approved', 'declined', 'unavailable'
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_documents"
      ADD COLUMN "back_image_reference" varchar(512),
      ADD COLUMN "document_check_status" "identity_verification"."document_check_status_enum",
      ADD COLUMN "document_check_warnings" jsonb,
      ADD COLUMN "document_check_image_hash" varchar(64),
      ADD COLUMN "document_check_request_id" varchar(128),
      ADD COLUMN "document_checked_at" timestamptz;
    `);

    await queryRunner.query(`
      CREATE TYPE "identity_verification"."biometric_session_status_enum" AS ENUM (
        'created', 'approved', 'declined', 'in_review', 'expired'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "identity_verification"."biometric_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "document_id" uuid NOT NULL,
        "didit_session_id" varchar(128) NOT NULL,
        "hosted_url" varchar(512) NOT NULL,
        "status" "identity_verification"."biometric_session_status_enum" NOT NULL DEFAULT 'created',
        "last_event_timestamp" bigint,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_biometric_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_biometric_sessions_didit_session_id" UNIQUE ("didit_session_id"),
        CONSTRAINT "fk_biometric_sessions_profile_id"
          FOREIGN KEY ("profile_id")
          REFERENCES "identity_verification"."identity_verification_profiles" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_biometric_sessions_document_id"
          FOREIGN KEY ("document_id")
          REFERENCES "identity_verification"."identity_documents" ("id")
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_biometric_sessions_profile_id"
      ON "identity_verification"."biometric_sessions" ("profile_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_biometric_sessions_document_id"
      ON "identity_verification"."biometric_sessions" ("document_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "identity_verification"."processed_webhook_events" (
        "event_id" varchar(128) NOT NULL,
        "session_id" varchar(128) NOT NULL,
        "received_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_processed_webhook_events" PRIMARY KEY ("event_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_processed_webhook_events_session_id"
      ON "identity_verification"."processed_webhook_events" ("session_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_documents"
      ALTER COLUMN "document_number" DROP NOT NULL,
      ALTER COLUMN "document_number_normalized" DROP NOT NULL,
      ALTER COLUMN "expiration_date" DROP NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "identity_verification"."attempt_reservations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "reserved_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_attempt_reservations" PRIMARY KEY ("id"),
        CONSTRAINT "fk_attempt_reservations_profile_id"
          FOREIGN KEY ("profile_id")
          REFERENCES "identity_verification"."identity_verification_profiles" ("id")
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_attempt_reservations_profile_id"
      ON "identity_verification"."attempt_reservations" ("profile_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "identity_verification"."attempt_reservations";`);

    // Re-imposing NOT NULL here will fail if any row was ever backfilled to
    // null by the scan-path flow this migration enables — expected/accepted
    // for a down migration, not worked around here.
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_documents"
      ALTER COLUMN "document_number" SET NOT NULL,
      ALTER COLUMN "document_number_normalized" SET NOT NULL,
      ALTER COLUMN "expiration_date" SET NOT NULL;
    `);
    await queryRunner.query(`DROP TABLE "identity_verification"."processed_webhook_events";`);
    await queryRunner.query(`DROP TABLE "identity_verification"."biometric_sessions";`);
    await queryRunner.query(`DROP TYPE "identity_verification"."biometric_session_status_enum";`);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_documents"
      DROP COLUMN "back_image_reference",
      DROP COLUMN "document_check_status",
      DROP COLUMN "document_check_warnings",
      DROP COLUMN "document_check_image_hash",
      DROP COLUMN "document_check_request_id",
      DROP COLUMN "document_checked_at";
    `);
    await queryRunner.query(`DROP TYPE "identity_verification"."document_check_status_enum";`);
  }
}
