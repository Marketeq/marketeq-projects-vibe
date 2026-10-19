import { MigrationInterface, QueryRunner } from 'typeorm';

// PMCM-258: the seller's chosen display period for the Budget Calculator's
// cost-per-period figure. Nullable — null means "no preference saved yet"
// and every caller already treats that as "use the default period."
export class AddPricingPeriodToProject1799000000000
  implements MigrationInterface
{
  name = 'AddPricingPeriodToProject1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings"."project" ADD COLUMN IF NOT EXISTS "pricingPeriod" character varying(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings"."project" DROP COLUMN IF EXISTS "pricingPeriod"`,
    );
  }
}
