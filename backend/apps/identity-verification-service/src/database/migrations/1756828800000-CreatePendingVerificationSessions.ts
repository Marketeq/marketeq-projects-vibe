import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePendingVerificationSessions1756828800000 implements MigrationInterface {
  name = 'CreatePendingVerificationSessions1756828800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The enum types are schema-qualified deliberately. CreateIdentityVerificationSchema
    // creates them as "identity_verification".<name>, and a migration connection does
    // not carry that schema on its search_path, so the bare names this used to
    // reference resolved against public and failed with
    // `type "capture_method_enum" does not exist` — taking the whole batch down with
    // it, since migrations run in a single transaction. Every other statement in this
    // service's migrations is already qualified; these three were the exception.
    await queryRunner.query(`
      CREATE TABLE identity_verification.pending_verification_sessions (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "document_id" uuid NOT NULL,
        "vendor_session_id" varchar(128) NOT NULL,
        "attempt_number" smallint NOT NULL,
        "attempt_method" "identity_verification"."capture_method_enum" NOT NULL,
        "attempt_document_type" "identity_verification"."document_type_enum" NOT NULL,
        "vpn_proxy_detection_result" "identity_verification"."vpn_proxy_detection_result_enum" NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_pending_verification_sessions" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_pending_verification_sessions_vendor_session_id"
      ON identity_verification.pending_verification_sessions ("vendor_session_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE identity_verification.pending_verification_sessions;`);
  }
}
