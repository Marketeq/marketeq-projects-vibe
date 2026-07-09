// apps/offer-service/migrations/1706601700000-AddIndexes.ts
// OS-17: Migration 002 — Creates all indexes from OS-16.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1706601700000 implements MigrationInterface {
  name = 'AddIndexes1706601700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- offers indexes ----
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_offers_client_id ON offer_service.offers (client_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_offers_talent_id ON offer_service.offers (talent_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_offers_client_talent ON offer_service.offers (client_id, talent_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_offers_status_expires ON offer_service.offers (status, expires_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_offers_talent_status ON offer_service.offers (talent_id, status)`);

    // ---- counter_offers indexes ----
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_co_offer_id ON offer_service.counter_offers (offer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_co_offer_status ON offer_service.counter_offers (offer_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_co_expires ON offer_service.counter_offers (status, expires_at)`);

    // CRITICAL: Partial unique index — enforces one PENDING CO per offer at DB level
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_counter_offers_one_pending
        ON offer_service.counter_offers (offer_id)
        WHERE status = 'PENDING'
    `);

    // ---- offer_history indexes ----
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_oh_offer_id ON offer_service.offer_history (offer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_oh_offer_id_created ON offer_service.offer_history (offer_id, created_at DESC)`);

    // ---- outbox indexes ----
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_outbox_status_scheduled
        ON offer_service.outbox (status, scheduled_at)
        WHERE status IN ('PENDING', 'PROCESSING')
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_aggregate_id ON offer_service.outbox (aggregate_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_outbox_aggregate_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_outbox_status_scheduled`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_oh_offer_id_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_oh_offer_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.uq_counter_offers_one_pending`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_co_expires`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_co_offer_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_co_offer_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_offers_talent_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_offers_status_expires`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_offers_client_talent`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_offers_talent_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS offer_service.idx_offers_client_id`);
  }
}