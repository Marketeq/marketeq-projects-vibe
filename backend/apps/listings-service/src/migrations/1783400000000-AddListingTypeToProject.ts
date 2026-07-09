import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListingTypeToProject1783400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "listingType" character varying; EXCEPTION WHEN undefined_table THEN NULL; END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "project" DROP COLUMN IF EXISTS "listingType"; EXCEPTION WHEN undefined_table THEN NULL; END $$`,
    );
  }
}
