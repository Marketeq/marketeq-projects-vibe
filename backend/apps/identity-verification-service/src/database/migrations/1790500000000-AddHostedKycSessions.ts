import { MigrationInterface, QueryRunner } from 'typeorm';

// Additive: supports the Didit-hosted Free KYC flow.
//
// 1. hosted_kyc_sessions — one row per hosted session (Didit session id,
//    opaque vendor reference, status, last event timestamp). No hosted URL
//    is stored (see the entity's header comment).
// 2. verification_attempts.attempt_method / attempt_document_type become
//    nullable. Both were NOT NULL because every earlier attempt came from
//    our own capture flow; a Didit-hosted session's capture method and
//    document type are chosen and held by Didit, and we deliberately do not
//    invent values for them. The existing unique index on vendor_session_id
//    is what keeps a replayed Declined webhook from producing a second
//    attempt row for the same Didit session.
export class AddHostedKycSessions1790500000000 implements MigrationInterface {
  name = 'AddHostedKycSessions1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "identity_verification"."hosted_kyc_session_status_enum" AS ENUM (
        'created', 'in_progress', 'in_review', 'approved', 'declined',
        'abandoned', 'expired', 'kyc_expired'
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "identity_verification"."hosted_kyc_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "didit_session_id" varchar(128) NOT NULL,
        "vendor_reference" uuid NOT NULL,
        "status" "identity_verification"."hosted_kyc_session_status_enum" NOT NULL DEFAULT 'created',
        "last_event_timestamp" bigint,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_hosted_kyc_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_hosted_kyc_sessions_didit_session_id" UNIQUE ("didit_session_id"),
        CONSTRAINT "uq_hosted_kyc_sessions_vendor_reference" UNIQUE ("vendor_reference"),
        CONSTRAINT "fk_hosted_kyc_sessions_profile_id"
          FOREIGN KEY ("profile_id")
          REFERENCES "identity_verification"."identity_verification_profiles" ("id")
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_hosted_kyc_sessions_profile_id"
      ON "identity_verification"."hosted_kyc_sessions" ("profile_id");
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."verification_attempts"
      ALTER COLUMN "attempt_method" DROP NOT NULL,
      ALTER COLUMN "attempt_document_type" DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-imposing NOT NULL fails if any Free KYC attempt row exists —
    // expected/accepted for a down migration, not worked around here.
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."verification_attempts"
      ALTER COLUMN "attempt_method" SET NOT NULL,
      ALTER COLUMN "attempt_document_type" SET NOT NULL;
    `);
    await queryRunner.query(`DROP TABLE "identity_verification"."hosted_kyc_sessions";`);
    await queryRunner.query(`DROP TYPE "identity_verification"."hosted_kyc_session_status_enum";`);
  }
}
