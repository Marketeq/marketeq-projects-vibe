import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE billing_frequency_enum AS ENUM ('weekly', 'biweekly', 'monthly');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE subscription_status_enum AS ENUM ('active', 'paused', 'canceled', 'past_due');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE invoice_status_enum AS ENUM ('pending', 'paid', 'failed', 'finalized', 'voided', 'refunded');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // billing_subscriptions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_subscriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "groupId" VARCHAR NOT NULL,
        "contractId" VARCHAR,
        "clientId" VARCHAR NOT NULL,
        "stripeCustomerId" VARCHAR NOT NULL,
        "stripeSubscriptionId" VARCHAR NOT NULL,
        frequency billing_frequency_enum NOT NULL,
        "installmentAmount" DECIMAL(10,2) NOT NULL,
        "totalInstallments" INT NOT NULL,
        "paidInstallments" INT NOT NULL DEFAULT 1,
        "depositAmount" DECIMAL(10,2) DEFAULT 0,
        "depositPaid" BOOLEAN DEFAULT false,
        status subscription_status_enum NOT NULL DEFAULT 'active',
        "projectId" VARCHAR,
        "serviceId" VARCHAR,
        "startDate" VARCHAR,
        "endDate" VARCHAR,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_billing_subs_group ON billing_subscriptions ("groupId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_billing_subs_contract ON billing_subscriptions ("contractId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_billing_subs_client ON billing_subscriptions ("clientId")`);

    // billing_invoices
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_invoices (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "contractId" VARCHAR NOT NULL,
        "groupId" VARCHAR NOT NULL,
        "clientId" VARCHAR NOT NULL,
        "talentId" VARCHAR NOT NULL,
        "subscriptionId" VARCHAR,
        "stripeInvoiceId" VARCHAR,
        amount DECIMAL(10,2) NOT NULL,
        "creditApplied" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        status invoice_status_enum NOT NULL DEFAULT 'pending',
        "paidAt" VARCHAR,
        "finalizedAt" VARCHAR,
        "refundedAt" VARCHAR,
        description VARCHAR,
        "installmentNumber" INT,
        metadata JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_billing_inv_contract ON billing_invoices ("contractId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_billing_inv_group ON billing_invoices ("groupId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_billing_inv_stripe ON billing_invoices ("stripeInvoiceId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_billing_inv_sub ON billing_invoices ("subscriptionId")`);

    // billing_payment_retry_logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_payment_retry_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "invoiceId" VARCHAR NOT NULL,
        "subscriptionId" VARCHAR NOT NULL,
        "attemptNumber" INT NOT NULL,
        "stripePaymentIntentId" VARCHAR,
        "failureReason" VARCHAR,
        "nextRetryAt" VARCHAR,
        succeeded BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_billing_retry_invoice ON billing_payment_retry_logs ("invoiceId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS billing_payment_retry_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS billing_invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS billing_subscriptions`);
    await queryRunner.query(`DROP TYPE IF EXISTS invoice_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS subscription_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS billing_frequency_enum`);
  }
}
