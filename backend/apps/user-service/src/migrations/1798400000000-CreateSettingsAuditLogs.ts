import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The audit trail decided in 09a Q75 and never built.
 *
 * Records who changed what, when, and from where, for the security-relevant
 * actions taken through Settings. Until this existed the only record was log
 * lines, which are flushed routinely — 88 MB and 414 MB were flushed in single
 * sessions on the reference machine.
 *
 * Per service rather than shared, matching `transaction_service.audit_logs`
 * and the schema-per-service model.
 *
 * `subject_user_id` and `actor_user_id` are separate because they differ the
 * moment somebody acts on another person's account, which is precisely the
 * case an audit trail exists for.
 *
 * No foreign keys. An audit record must outlive the row it describes — a
 * cascade that deletes the record of a deletion defeats the purpose.
 *
 * Schema-qualified: an unqualified CREATE TABLE lands in `public`, not the
 * service schema. Idempotent throughout.
 */
export class CreateSettingsAuditLogs1798400000000 implements MigrationInterface {
  name = 'CreateSettingsAuditLogs1798400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.settings_audit_logs (
        "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
        "actor_user_id"   uuid NOT NULL,
        "subject_user_id" uuid NOT NULL,
        "action"          character varying(100) NOT NULL,
        "metadata"        jsonb,
        "ip_address"      character varying(255),
        "user_agent"      character varying(512),
        "created_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_settings_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    // Serves "show me this account's history, newest first" — the only read
    // pattern the trail is for.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_settings_audit_subject_created"
        ON user_service.settings_audit_logs ("subject_user_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_settings_audit_subject_user_id"
        ON user_service.settings_audit_logs ("subject_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_settings_audit_action"
        ON user_service.settings_audit_logs ("action")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS user_service."IDX_settings_audit_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS user_service."IDX_settings_audit_subject_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS user_service."IDX_settings_audit_subject_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.settings_audit_logs`);
  }
}
