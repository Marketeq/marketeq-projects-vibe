import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the W-9 line 4 exemption codes.
 *
 * Both are optional on the form itself, which states the codes "apply only to
 * certain entities, not individuals", so they are nullable and take no default.
 */
export class AddTaxInfoExemptions1797400000000 implements MigrationInterface {
  name = 'AddTaxInfoExemptions1797400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.tax_info
        ADD COLUMN IF NOT EXISTS "exemptPayeeCode" text,
        ADD COLUMN IF NOT EXISTS "fatcaExemptionCode" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.tax_info
        DROP COLUMN IF EXISTS "exemptPayeeCode",
        DROP COLUMN IF EXISTS "fatcaExemptionCode"
    `);
  }
}
