import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBillingAddresses1799700000000 implements MigrationInterface {
  name = 'CreateBillingAddresses1799700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.billing_addresses (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "fullName" character varying NOT NULL,
        "addressLine1" character varying NOT NULL,
        "addressLine2" character varying NULL,
        "city" character varying NOT NULL,
        "state" character varying NULL,
        "postalCode" character varying NOT NULL,
        "country" character varying NOT NULL,
        "phoneNumber" character varying NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_addresses_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_billing_addresses_userId"
      ON user_service.billing_addresses ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS user_service.billing_addresses`,
    );
  }
}
