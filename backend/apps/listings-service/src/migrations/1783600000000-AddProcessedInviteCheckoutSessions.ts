import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProcessedInviteCheckoutSessions1783600000000 implements MigrationInterface {
  name = "AddProcessedInviteCheckoutSessions1783600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listings"."job_listings"
      ADD COLUMN IF NOT EXISTS "processed_invite_checkout_session_ids" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listings"."job_listings"
      DROP COLUMN IF EXISTS "processed_invite_checkout_session_ids"
    `);
  }
}
