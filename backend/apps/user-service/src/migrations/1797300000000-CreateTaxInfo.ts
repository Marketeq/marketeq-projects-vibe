import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Taxpayer details backing the W-9 / W-8 series substitute form, in their own
 * table rather than on `users`: the TIN must never ride along with the profile
 * payload that every surface reads.
 */
export class CreateTaxInfo1797300000000 implements MigrationInterface {
  name = 'CreateTaxInfo1797300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.tax_info (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "legalFullName" text NULL,
        "federalTaxClassification" text NULL,
        "tinType" text NULL,
        "tin" text NULL,
        "country" text NULL,
        "addressLine1" text NULL,
        "addressLine2" text NULL,
        "city" text NULL,
        "stateOrProvince" text NULL,
        "postalCode" text NULL,
        "signature" text NULL,
        "signedDate" text NULL,
        "consentESignature" boolean NOT NULL DEFAULT false,
        "consentDigitalDelivery" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tax_info_id" PRIMARY KEY ("id")
      )
    `);

    // One row per user; the upsert relies on this.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tax_info_userId"
      ON user_service.tax_info ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.tax_info`);
  }
}
