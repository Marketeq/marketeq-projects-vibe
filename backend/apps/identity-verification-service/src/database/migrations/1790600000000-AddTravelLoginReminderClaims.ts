import { MigrationInterface, QueryRunner } from 'typeorm';

// Additive: per-login-session idempotency for the Travel Mode login reminder
// ("5 minutes after authentication, once per login session").
//
// One row means "this login session (sid) already claimed its login reminder".
// The profile's single last_travel_reminder_sent_at cursor cannot tell two login
// sessions apart (a claim by session A would swallow session B's reminder, and a
// refresh or second tab of A could claim it again), so the claim is a unique
// (profile_id, session_id) row instead. Rows are written only when a reminder is
// actually claimed, so growth is bounded by logins made while Travel Mode is on.
//
// No TypeORM entity: the table is only touched by two fixed statements in
// IdentityVerificationService (an existence check and an INSERT ... ON CONFLICT
// DO NOTHING under a per-profile advisory lock). The day 3 / day 7 reminders and
// last_travel_reminder_sent_at are unchanged.
export class AddTravelLoginReminderClaims1790600000000 implements MigrationInterface {
  name = 'AddTravelLoginReminderClaims1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "identity_verification"."travel_login_reminder_claims" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "session_id" varchar(128) NOT NULL,
        "claimed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_travel_login_reminder_claims" PRIMARY KEY ("id"),
        CONSTRAINT "uq_travel_login_reminder_claims_profile_session" UNIQUE ("profile_id", "session_id"),
        CONSTRAINT "fk_travel_login_reminder_claims_profile_id"
          FOREIGN KEY ("profile_id")
          REFERENCES "identity_verification"."identity_verification_profiles" ("id")
          ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "identity_verification"."travel_login_reminder_claims";`);
  }
}
