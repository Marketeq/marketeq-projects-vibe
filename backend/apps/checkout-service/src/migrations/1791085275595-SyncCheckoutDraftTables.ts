import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncCheckoutDraftTables1791085275595 implements MigrationInterface {
  name = 'SyncCheckoutDraftTables1791085275595';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_draft_phases"
        ADD COLUMN IF NOT EXISTS "isDraftOverride" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_draft_tasks"
        DROP COLUMN IF EXISTS "description"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_draft_tasks"
        ADD COLUMN IF NOT EXISTS "description" text
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_draft_phases"
        DROP COLUMN IF EXISTS "isDraftOverride"
    `);
  }
}
