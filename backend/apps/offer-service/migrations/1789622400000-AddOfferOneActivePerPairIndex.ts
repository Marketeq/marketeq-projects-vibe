// apps/offer-service/migrations/1789622400000-AddOfferOneActivePerPairIndex.ts
// PMCM-393 AC-41.01/41.06: the service-layer checkActiveOfferConstraint()
// (offers.service.ts) is check-then-insert with no constraint behind it —
// a real race window in both create() and resend(). This closes it at the
// DB level, following the uq_counter_offers_one_pending pattern in
// 1706601700000-AddIndexes.ts exactly: a partial unique index, not
// CONCURRENTLY (matching that same precedent — CREATE INDEX CONCURRENTLY
// cannot run inside a transaction block, and TypeORM wraps each
// migration's up() in one by default).
//
// Deploy note: verified against the cloud DB before writing this file —
// two pairs currently violate this constraint (both against the same
// talent, one pair with two PENDING offers, one with two COUNTERED; all
// four are fixed-UUID seed rows). CREATE UNIQUE INDEX will fail loudly on
// any environment carrying that seed data ("could not create unique
// index ... is duplicated"), not silently drop or merge anything — one
// offer from each pair must be withdrawn through the normal endpoint
// before this migration can apply there.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfferOneActivePerPairIndex1789622400000 implements MigrationInterface {
  name = 'AddOfferOneActivePerPairIndex1789622400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // CRITICAL: Partial unique index — enforces one active (PENDING or
    // COUNTERED) offer per client-talent pair at the DB level.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_offers_one_active_per_pair
        ON offer_service.offers (client_id, talent_id)
        WHERE status IN ('PENDING', 'COUNTERED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.uq_offers_one_active_per_pair`);
  }
}
