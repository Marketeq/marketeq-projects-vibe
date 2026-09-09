import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePendingVerificationSessions1756828800000 implements MigrationInterface {
  name = 'CreatePendingVerificationSessions1756828800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE identity_verification.pending_verification_sessions (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "document_id" uuid NOT NULL,
        "vendor_session_id" varchar(128) NOT NULL,
        "attempt_number" smallint NOT NULL,
        "attempt_method" capture_method_enum NOT NULL,
        "attempt_document_type" document_type_enum NOT NULL,
        "vpn_proxy_detection_result" vpn_proxy_detection_result_enum NOT NULL,
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
