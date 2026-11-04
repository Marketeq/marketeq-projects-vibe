import { MigrationInterface, QueryRunner } from "typeorm";

// PMCM-837: contracts carry the currency their rate was agreed in (the
// offer's currency_code), so the desktop tracker stops showing every
// contract's earnings as USD. Existing contracts default to USD, which is
// what they were shown in before.
export class AddCurrencyCodeToContracts1797465600000 implements MigrationInterface {
    name = 'AddCurrencyCodeToContracts1797465600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "currencyCode" character(3) NOT NULL DEFAULT 'USD'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "currencyCode"`);
    }

}
