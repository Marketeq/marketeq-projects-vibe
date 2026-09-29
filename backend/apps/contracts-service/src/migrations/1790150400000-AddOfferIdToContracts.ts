import { MigrationInterface, QueryRunner } from "typeorm";

// OS-07 (CR-01): contracts are created from the offer.accepted payload, and
// ContractInput carries offerId so contracts-service can tie a contract back
// to the offer it came from. Nullable — contracts created before the offer
// handoff existed have no offer. The unique index is what makes the
// offer.accepted consumer idempotent: a redelivered event can't create a
// second contract for the same offer.
export class AddOfferIdToContracts1790150400000 implements MigrationInterface {
    name = 'AddOfferIdToContracts1790150400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "offerId" uuid`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_contracts_offerId" ON "contracts" ("offerId") WHERE "offerId" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_contracts_offerId"`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "offerId"`);
    }

}
