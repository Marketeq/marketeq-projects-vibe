import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStripeCustomersAndSavedCards1792300000000 implements MigrationInterface {
  name = 'CreateStripeCustomersAndSavedCards1792300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."stripe_customers" (
        "userId" uuid NOT NULL,
        "stripeCustomerId" character varying NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stripe_customers_userId" PRIMARY KEY ("userId"),
        CONSTRAINT "UQ_stripe_customers_stripeCustomerId" UNIQUE ("stripeCustomerId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."saved_cards" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "stripePaymentMethodId" character varying NOT NULL,
        "fingerprint" character varying NULL,
        "brand" character varying NOT NULL,
        "funding" character varying NOT NULL,
        "last4" character varying NOT NULL,
        "expMonth" integer NOT NULL,
        "expYear" integer NOT NULL,
        "billingAddressId" uuid NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_cards_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_saved_cards_stripePaymentMethodId" UNIQUE ("stripePaymentMethodId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_saved_cards_userId"
      ON "checkout"."saved_cards" ("userId")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_saved_cards_one_default_per_user"
      ON "checkout"."saved_cards" ("userId")
      WHERE "isDefault" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "checkout"."saved_cards"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "checkout"."stripe_customers"`,
    );
  }
}
