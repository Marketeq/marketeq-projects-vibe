import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCheckoutSessionProjectIdToListingId1791200000000
  implements MigrationInterface
{
  name = 'RenameCheckoutSessionProjectIdToListingId1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'checkout' AND table_name = 'checkout_sessions'
            AND column_name = 'projectId'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'checkout' AND table_name = 'checkout_sessions'
            AND column_name = 'listingId'
        ) THEN
          ALTER TABLE "checkout"."checkout_sessions"
            RENAME COLUMN "projectId" TO "listingId";
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM "checkout"."checkout_sessions" WHERE "listingId" IS NULL
        ) THEN
          RAISE EXCEPTION 'checkout_sessions has rows with a null listingId, fix them before running this migration';
        END IF;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_sessions"
        ALTER COLUMN "listingId" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_sessions"
        ALTER COLUMN "listingId" DROP NOT NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'checkout' AND table_name = 'checkout_sessions'
            AND column_name = 'listingId'
        ) THEN
          ALTER TABLE "checkout"."checkout_sessions"
            RENAME COLUMN "listingId" TO "projectId";
        END IF;
      END $$
    `);
  }
}
