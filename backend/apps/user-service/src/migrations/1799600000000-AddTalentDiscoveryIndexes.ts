import { MigrationInterface, QueryRunner } from 'typeorm';

// G1: ordered-scan indexes for the talent discovery queries that now filter by gate INSIDE the
// query (see 1799500000000-CreateTalentGateState).
//
// With the gate as a semi-join, PostgreSQL can walk the talent rows in display order and probe the
// gate table for each (a nested-loop semi-join on the gate table's primary key / partial index),
// stopping as soon as the page is full - but only if an index delivers the rows already in that
// order. Without these two, it instead scans the whole talent table, hashes every open gate row and
// sorts the lot to return 20 rows (measured on a local 200k-profile table: Seq Scan + HashAggregate +
// Sort, ~65-75 ms and temp-file spills per request; with the indexes: ordered index scan + PK probe,
// ~13-16 ms, no temp files).
//
//  - talent_profiles: serves GET /public/talent and talent recommendations
//    (ORDER BY "updatedAt" DESC, id ASC, active profiles only).
//  - users: serves GET /talent/users (ORDER BY "onboardedAt" DESC, id ASC, talent users only).
//
// Both are partial (they hold only the rows the queries can ever return) and additive. Plain
// CREATE INDEX takes a short write lock on a table of this size; run it in a quiet window if the
// tables have grown large.
export class AddTalentDiscoveryIndexes1799600000000 implements MigrationInterface {
  name = 'AddTalentDiscoveryIndexes1799600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_talent_profiles_active_updated"
        ON "user_service"."talent_profiles" ("updatedAt" DESC, "id" ASC)
        WHERE "status" = 'active'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_talent_onboarded"
        ON "user_service"."users" ("onboardedAt" DESC, "id" ASC)
        WHERE "userType" = 'talent'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "user_service"."IDX_users_talent_onboarded"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "user_service"."IDX_talent_profiles_active_updated"`);
  }
}
