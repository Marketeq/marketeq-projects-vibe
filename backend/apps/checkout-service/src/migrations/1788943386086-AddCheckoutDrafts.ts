import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckoutDrafts1788943386086 implements MigrationInterface {
  name = 'AddCheckoutDrafts1788943386086';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "checkout"."checkout_drafts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clientId" character varying NOT NULL,
        "listingId" character varying NOT NULL,
        "phases" jsonb NOT NULL DEFAULT '[]',
        "projectCost" numeric(10,2),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checkout_drafts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_checkout_drafts_client_listing" UNIQUE ("clientId", "listingId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "checkout"."checkout_drafts"`);
  }
}
