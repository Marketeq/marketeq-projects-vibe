import { MigrationInterface, QueryRunner } from 'typeorm';

// G1 (PostgreSQL discovery paths): the last known gate_open of every talent account, kept in
// user-service's own schema and read with a plain SQL semi-join, so talent search, browse and
// recommendations are filtered INSIDE the database query (before pagination and counting) instead
// of loading talent and asking identity-verification-service about them page by page.
//
// Written only from identity-verification-service's `identity.gate_changed` events (own durable
// queue) and a background reconcile. "No row" means the state has never been received, which
// discovery treats as hidden. Deliberately NOT a foreign key onto users or talent profiles:
// visibility is a display filter and can never touch (or cascade into) a profile.
//
// Indexes:
//  - PRIMARY KEY ("userId"): the semi-join from users / talent profiles (uuid = uuid).
//  - partial expression index on ("userId"::text) WHERE "gateOpen": the semi-join from search-service,
//    whose talent rows carry the account id as text (cms.talent_profiles.source_id), and the
//    "how many talent are visible" count; it holds only the open accounts, so it stays small.
export class CreateTalentGateState1799500000000 implements MigrationInterface {
  name = 'CreateTalentGateState1799500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service"."talent_gate_state" (
        "userId" uuid NOT NULL,
        "gateOpen" boolean NOT NULL,
        "occurredAt" timestamptz NOT NULL,
        "receivedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_talent_gate_state" PRIMARY KEY ("userId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_talent_gate_state_open_text"
        ON "user_service"."talent_gate_state" (("userId"::text))
        WHERE "gateOpen"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "user_service"."IDX_talent_gate_state_open_text"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service"."talent_gate_state"`);
  }
}
