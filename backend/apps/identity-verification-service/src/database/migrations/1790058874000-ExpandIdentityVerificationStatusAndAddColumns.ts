import { MigrationInterface, QueryRunner } from 'typeorm';

// Additive follow-up to CreateIdentityVerificationSchema1756742400000,
// matching the same pattern as CreatePendingVerificationSessions and
// AddPerformanceIndexes — the original migration is already merged to
// dev-main and is not edited in place.
//
// Expands identity_verification_status_enum from the original four-value
// placeholder model to TRVG2 §1.1's confirmed nine-value model, and adds
// the columns TRVG2 §1.1/§2/§3 require: document_expires_on,
// last_evaluated_at, expired_at, eligible_on, plus this pass's own
// failed_final_at (not part of Doc 03's confirmed schema — see the
// entity comment). Also adds identity_documents.document_type_label
// (TRVG2 §1.4, display-only).
//
// SAFETY NOTE: the enum recreation below (ALTER COLUMN ... TYPE text,
// DROP TYPE, CREATE TYPE, ALTER COLUMN ... TYPE ... USING) assumes no
// rows currently exist in the old four-value shape (not_verified /
// submitted_pending_review / verified / rejected_blocked). This is true
// for every environment this migration has been run against so far. Doc
// 03 itself notes the old-to-new value mapping is not resolved by any
// source — do not run this against a database that already holds rows
// in the old enum shape without first deciding that mapping.
export class ExpandIdentityVerificationStatusAndAddColumns1790058874000
  implements MigrationInterface
{
  name = 'ExpandIdentityVerificationStatusAndAddColumns1790058874000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Recreate identity_verification_status_enum with the nine
    // confirmed values (TRVG2 §1.1).
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ALTER COLUMN "identity_verification_status" DROP DEFAULT;
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ALTER COLUMN "identity_verification_status" TYPE varchar
      USING "identity_verification_status"::text;
    `);
    await queryRunner.query(`
      DROP TYPE "identity_verification"."identity_verification_status_enum";
    `);
    await queryRunner.query(`
      CREATE TYPE "identity_verification"."identity_verification_status_enum" AS ENUM (
        'unstarted', 'in_progress', 'pending', 'verified', 'failed',
        'failed_final', 'blocked_duplicate', 'blocked_age', 'expired'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ALTER COLUMN "identity_verification_status"
      TYPE "identity_verification"."identity_verification_status_enum"
      USING "identity_verification_status"::"identity_verification"."identity_verification_status_enum";
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ALTER COLUMN "identity_verification_status" SET DEFAULT 'unstarted';
    `);

    // 2. New profile columns (TRVG2 §1.1, §2, §3).
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ADD COLUMN "document_expires_on" date,
      ADD COLUMN "last_evaluated_at" timestamptz,
      ADD COLUMN "expired_at" timestamptz,
      ADD COLUMN "eligible_on" date,
      ADD COLUMN "failed_final_at" timestamptz;
    `);

    // 3. Display-only document type label (TRVG2 §1.4).
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_documents"
      ADD COLUMN "document_type_label" varchar(100);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_documents"
      DROP COLUMN "document_type_label";
    `);

    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      DROP COLUMN "failed_final_at",
      DROP COLUMN "eligible_on",
      DROP COLUMN "expired_at",
      DROP COLUMN "last_evaluated_at",
      DROP COLUMN "document_expires_on";
    `);

    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ALTER COLUMN "identity_verification_status" DROP DEFAULT;
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ALTER COLUMN "identity_verification_status" TYPE varchar
      USING "identity_verification_status"::text;
    `);
    await queryRunner.query(`
      DROP TYPE "identity_verification"."identity_verification_status_enum";
    `);
    await queryRunner.query(`
      CREATE TYPE "identity_verification"."identity_verification_status_enum" AS ENUM (
        'not_verified', 'submitted_pending_review', 'verified', 'rejected_blocked'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ALTER COLUMN "identity_verification_status" TYPE
      "identity_verification"."identity_verification_status_enum"
      USING (
        CASE "identity_verification_status"::text
          WHEN 'unstarted' THEN 'not_verified'
          WHEN 'in_progress' THEN 'submitted_pending_review'
          WHEN 'pending' THEN 'submitted_pending_review'
          WHEN 'verified' THEN 'verified'
          ELSE 'rejected_blocked'
        END
      )::"identity_verification"."identity_verification_status_enum";
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ALTER COLUMN "identity_verification_status" SET DEFAULT 'not_verified';
    `);
  }
}
