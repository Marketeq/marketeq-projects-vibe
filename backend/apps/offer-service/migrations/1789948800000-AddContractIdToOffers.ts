// apps/offer-service/migrations/1789948800000-AddContractIdToOffers.ts
// PMCM-392 AC-40.06: "offer-service subscribes to this event [contract.created]
// and stores the contractId on the offer record." This migration lands only
// the storage half — the column itself, not the subscriber. Nullable, no
// default: an offer has no contract until contracts-service creates one on
// acceptance, and most offers (declined, withdrawn, expired, or still
// pending) never will. No foreign key — contracts-service owns its own
// tables in its own schema/database, so there is nothing in offer_service
// to reference.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractIdToOffers1789948800000 implements MigrationInterface {
  name = 'AddContractIdToOffers1789948800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE offer_service.offers
        ADD COLUMN IF NOT EXISTS contract_id UUID
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE offer_service.offers
        DROP COLUMN IF EXISTS contract_id
    `);
  }
}
