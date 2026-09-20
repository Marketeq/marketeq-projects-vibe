import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityVerificationSchema1756742400000 implements MigrationInterface {
  name = 'CreateIdentityVerificationSchema1756742400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "identity_verification"`);

    // Create extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Create enum types
    await queryRunner.query(
      `CREATE TYPE "identity_verification"."travel_classification_enum" AS ENUM('temporarily_traveling', 'permanently_relocated')`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity_verification"."declared_duration_enum" AS ENUM('a_few_days', 'one_to_two_weeks', 'more_than_two_weeks', 'not_sure')`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity_verification"."identity_verification_status_enum" AS ENUM('not_verified', 'submitted_pending_review', 'verified', 'rejected_blocked')`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity_verification"."location_verification_status_enum" AS ENUM('not_verified', 'submitted_pending_review', 'verified')`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity_verification"."document_type_enum" AS ENUM('passport', 'id_card', 'drivers_licence', 'residence_permit')`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity_verification"."capture_method_enum" AS ENUM('scan', 'manual_entry')`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity_verification"."verification_depth_enum" AS ENUM('registry_validated', 'authenticated')`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity_verification"."vpn_proxy_detection_result_enum" AS ENUM('none', 'vpn_detected', 'proxy_detected', 'vpn_and_proxy_detected')`,
    );

    // Create identity_verification_profiles table
    await queryRunner.query(
      `CREATE TABLE "identity_verification"."identity_verification_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE,
        "verified_home_country" char(2),
        "verified_home_country_confirmed_at" TIMESTAMP WITH TIME ZONE,
        "detected_country" char(2),
        "detected_region_state" varchar(120),
        "detected_city" varchar(120),
        "time_zone" varchar(64),
        "travel_classification" "identity_verification"."travel_classification_enum",
        "declared_duration" "identity_verification"."declared_duration_enum",
        "travel_mode_active" boolean NOT NULL DEFAULT false,
        "travel_mode_activated_at" TIMESTAMP WITH TIME ZONE,
        "last_travel_reminder_sent_at" TIMESTAMP WITH TIME ZONE,
        "next_travel_reminder_at" TIMESTAMP WITH TIME ZONE,
        "identity_verification_status" "identity_verification"."identity_verification_status_enum" NOT NULL DEFAULT 'not_verified',
        "identity_rejection_reason" varchar(64),
        "location_verification_status" "identity_verification"."location_verification_status_enum" NOT NULL DEFAULT 'not_verified',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_ivp_user_id" ON "identity_verification"."identity_verification_profiles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ivp_identity_status" ON "identity_verification"."identity_verification_profiles" ("identity_verification_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ivp_location_status" ON "identity_verification"."identity_verification_profiles" ("location_verification_status")`,
    );

    // Create identity_documents table
    await queryRunner.query(
      `CREATE TABLE "identity_verification"."identity_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "document_type" "identity_verification"."document_type_enum" NOT NULL,
        "issuing_country" char(2) NOT NULL,
        "document_number" varchar(64) NOT NULL,
        "document_number_normalized" varchar(64) NOT NULL,
        "expiration_date" date NOT NULL,
        "issuing_state" varchar(10),
        "capture_method" "identity_verification"."capture_method_enum" NOT NULL,
        "document_image_reference" varchar(512) NOT NULL,
        "verification_depth" "identity_verification"."verification_depth_enum",
        "is_duplicate_match" boolean NOT NULL DEFAULT false,
        "duplicate_of_document_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("id"),
        CONSTRAINT "fk_identity_documents_profile_id" FOREIGN KEY ("profile_id") REFERENCES "identity_verification"."identity_verification_profiles" ("id") ON DELETE CASCADE,
        CONSTRAINT "chk_identity_documents_issuing_state" CHECK ("issuing_state" IS NULL OR "document_type" = 'drivers_licence')
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_identity_documents_profile_id" ON "identity_verification"."identity_documents" ("profile_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_identity_documents_fingerprint" ON "identity_verification"."identity_documents" ("document_number_normalized")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_identity_documents_duplicate_of" ON "identity_verification"."identity_documents" ("duplicate_of_document_id")`,
    );

    // Create verification_attempts table
    await queryRunner.query(
      `CREATE TABLE "identity_verification"."verification_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "document_id" uuid,
        "vendor_session_id" varchar(128) NOT NULL UNIQUE,
        "attempt_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "attempt_method" "identity_verification"."capture_method_enum" NOT NULL,
        "attempt_document_type" "identity_verification"."document_type_enum" NOT NULL,
        "attempt_outcome" varchar(32) NOT NULL,
        "failure_code" varchar(64),
        "attempt_number" smallint NOT NULL,
        "vpn_proxy_detection_result" "identity_verification"."vpn_proxy_detection_result_enum" NOT NULL DEFAULT 'none',
        PRIMARY KEY ("id"),
        CONSTRAINT "fk_verification_attempts_profile_id" FOREIGN KEY ("profile_id") REFERENCES "identity_verification"."identity_verification_profiles" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_verification_attempts_document_id" FOREIGN KEY ("document_id") REFERENCES "identity_verification"."identity_documents" ("id") ON DELETE CASCADE,
        CONSTRAINT "chk_verification_attempts_attempt_number" CHECK ("attempt_number" >= 1 AND "attempt_number" <= 3)
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_verification_attempts_profile_id" ON "identity_verification"."verification_attempts" ("profile_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_verification_attempts_document_id" ON "identity_verification"."verification_attempts" ("document_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_verification_attempts_vendor_session_id" ON "identity_verification"."verification_attempts" ("vendor_session_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "identity_verification"."verification_attempts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identity_verification"."identity_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identity_verification"."identity_verification_profiles"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "identity_verification"."vpn_proxy_detection_result_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identity_verification"."verification_depth_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identity_verification"."capture_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identity_verification"."document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identity_verification"."location_verification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identity_verification"."identity_verification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identity_verification"."declared_duration_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identity_verification"."travel_classification_enum"`);

    // Drop schema
    await queryRunner.query(`DROP SCHEMA IF EXISTS "identity_verification"`);
  }
}
