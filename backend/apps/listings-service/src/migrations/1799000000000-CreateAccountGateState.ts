import { MigrationInterface, QueryRunner } from 'typeorm';

// G5: the last known gate_open of every platform account a client-facing roster
// can show (listing owners, members, assignees). Written only from
// identity-verification-service's `identity.gate_changed` events (plus a
// background reconcile), read by rosters with one local query - a roster is
// never built from a live identity lookup. "No row" means the state has never
// been received, which rosters treat as hidden.
//
// Deliberately NOT a foreign key onto project/team/member rows: visibility is a
// display filter, so changing it can never touch (or cascade into) a listing,
// a membership or any other record.
export class CreateAccountGateState1799000000000 implements MigrationInterface {
  name = 'CreateAccountGateState1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listings"."account_gate_state" (
        "userId" uuid NOT NULL,
        "gateOpen" boolean NOT NULL,
        "occurredAt" timestamptz NOT NULL,
        "receivedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_gate_state" PRIMARY KEY ("userId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "listings"."account_gate_state"`);
  }
}
