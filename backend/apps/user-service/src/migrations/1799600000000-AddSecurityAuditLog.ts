import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Durable record of what privileged accounts did.
 *
 * ── Why a new table rather than an existing one ──
 * Several services keep business audit trails (payout_audit_log,
 * transaction audit_logs, contracts audit). Those answer "what happened to
 * this object". This answers "what did this actor do", which is the question
 * an incident review asks, and it has to span services to be useful — one
 * query, not six.
 *
 * ── Why its own schema ──
 * Every service here owns a schema and does not read another's. An audit log
 * is the deliberate exception: it is written by several services and read as
 * one timeline, so putting it inside `user_service` would make user-service
 * the owner of records about payouts and wire transfers. `security_audit` is
 * neutral ground. All services share one Postgres instance, so no new
 * connection or credential is needed.
 *
 * user-service runs the migration because it is the identity service and has
 * the migration runner already wired; the table does not belong to it.
 *
 * ── Append-only by intention ──
 * There is no update path and no code that deletes. An audit trail a
 * privileged user can quietly edit is not an audit trail. Enforcing that at
 * the database level needs a role that holds INSERT and SELECT but not
 * UPDATE or DELETE, which is a deployment change rather than a migration —
 * recorded as a follow-up, not done here.
 */
export class AddSecurityAuditLog1799600000000 implements MigrationInterface {
  name = 'AddSecurityAuditLog1799600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS security_audit`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_audit.privileged_actions (
        "id"          bigserial PRIMARY KEY,
        -- The user id, or 'service:internal-token', or 'anonymous'.
        -- Deliberately text, not a FK to users: an audit row must survive the
        -- account being deleted, which is itself an auditable act.
        "actor"       character varying(128) NOT NULL,
        "actor_role"  character varying(32)  NOT NULL DEFAULT 'none',
        -- "METHOD /path"
        "action"      character varying(256) NOT NULL,
        "target"      character varying(128),
        "outcome"     character varying(16)  NOT NULL,
        "reason"      character varying(256),
        "ip"          character varying(64),
        "request_id"  character varying(128),
        -- When the action happened, as the emitting service saw it.
        "at"          timestamptz NOT NULL,
        -- When the row landed. A gap between the two means the sink lagged.
        "recorded_at" timestamptz NOT NULL DEFAULT now(),
        "service"     character varying(64)
      )
    `);

    // "What did this account do" and "what happened in this window" are the
    // two queries a review runs; both should be index-served.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_privileged_actions_actor_at"
        ON security_audit.privileged_actions ("actor", "at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_privileged_actions_at"
        ON security_audit.privileged_actions ("at" DESC)
    `);
    // Denials are the smaller, more interesting set — index them separately
    // so scanning for refused privileged access does not read allowed rows.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_privileged_actions_denied"
        ON security_audit.privileged_actions ("at" DESC)
        WHERE "outcome" = 'denied'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS security_audit.privileged_actions`);
    // The schema is left in place: dropping it would take any other
    // service's audit table with it.
  }
}
