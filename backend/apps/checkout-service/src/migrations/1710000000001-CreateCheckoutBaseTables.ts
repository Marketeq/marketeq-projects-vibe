import { MigrationInterface, QueryRunner } from 'typeorm';

const createEnum = (name: string, values: string[]) => `
  DO $$ BEGIN
    CREATE TYPE "checkout"."${name}" AS ENUM(${values.map((value) => `'${value}'`).join(', ')});
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$
`;

export class CreateCheckoutBaseTables1710000000001
  implements MigrationInterface
{
  name = 'CreateCheckoutBaseTables1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "checkout"`);

    await queryRunner.query(
      createEnum('checkout_sessions_paymentmethod_enum', [
        'card',
        'ach',
        'wire',
      ]),
    );
    await queryRunner.query(
      createEnum('checkout_sessions_status_enum', [
        'pending',
        'success',
        'failed',
        'cancelled',
        'refunded',
      ]),
    );
    await queryRunner.query(
      createEnum('checkout_sessions_installmentplan_enum', [
        'full',
        'monthly',
        'biweekly',
      ]),
    );
    await queryRunner.query(
      createEnum('wallet_transactions_type_enum', [
        'topup',
        'giftcard',
        'payment',
      ]),
    );
    await queryRunner.query(
      createEnum('wallet_transactions_status_enum', ['pending', 'completed']),
    );
    await queryRunner.query(
      createEnum('installment_payments_frequency_enum', [
        'weekly',
        'biweekly',
        'monthly',
        'quarterly',
        'yearly',
      ]),
    );
    await queryRunner.query(
      createEnum('installment_payments_status_enum', [
        'active',
        'canceled',
        'paused',
      ]),
    );
    await queryRunner.query(
      createEnum('wire_transfers_status_enum', [
        'pending',
        'verified',
        'rejected',
      ]),
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."checkout_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clientId" character varying NOT NULL,
        "projectId" character varying,
        "contractId" character varying,
        "stripeSessionId" character varying,
        "stripePaymentIntentId" character varying,
        "stripeSubscriptionId" character varying,
        "paymentMethod" "checkout"."checkout_sessions_paymentmethod_enum" NOT NULL DEFAULT 'card',
        "status" "checkout"."checkout_sessions_status_enum" NOT NULL DEFAULT 'pending',
        "installmentPlan" "checkout"."checkout_sessions_installmentplan_enum" NOT NULL DEFAULT 'full',
        "totalAmount" numeric(10,2) NOT NULL,
        "giftCardCode" character varying,
        "giftCardAmountUsed" numeric(10,2) NOT NULL DEFAULT 0,
        "walletAmountUsed" numeric(10,2) NOT NULL DEFAULT 0,
        "splitPaymentEnabled" boolean NOT NULL DEFAULT false,
        "initialPaymentAmount" numeric(10,2),
        "paymentVerified" boolean NOT NULL DEFAULT false,
        "stripeMetadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_5730b2bbc190203a94941d82bd1" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."gift_cards" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" character varying NOT NULL,
        "originalAmount" numeric(10,2) NOT NULL,
        "remainingAmount" numeric(10,2) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "redeemedByUserId" character varying,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_08ff997110a4e3842076964f0ed" UNIQUE ("code"),
        CONSTRAINT "PK_66a0b66755efd01b1749861b4aa" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."wallets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" character varying NOT NULL,
        "balance" numeric(10,2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_2ecdb33f23e9a6fc392025c0b97" UNIQUE ("userId"),
        CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."wallet_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "type" "checkout"."wallet_transactions_type_enum" NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "status" "checkout"."wallet_transactions_status_enum" NOT NULL DEFAULT 'pending',
        "reason" text,
        "sourceIp" text,
        "userAgent" text,
        "createdBy" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_69454773f1e666a14c6a953935" ON "checkout"."wallet_transactions" ("userId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."payment_failures" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "paymentMethodId" text NOT NULL,
        "failureCount" integer NOT NULL DEFAULT 0,
        "lastFailureAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_de07bdbef4df61fc5fe5ac3b8ac" UNIQUE ("userId", "paymentMethodId"),
        CONSTRAINT "PK_38cd20ea68a63d212222171c64e" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."installment_payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "contractId" uuid,
        "frequency" "checkout"."installment_payments_frequency_enum" NOT NULL,
        "stripeSubscriptionId" text NOT NULL,
        "status" "checkout"."installment_payments_status_enum" NOT NULL DEFAULT 'active',
        "nextPaymentDue" TIMESTAMP WITH TIME ZONE,
        "totalPayments" integer NOT NULL,
        "completedPayments" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_067d1ad6172df1562048fb773be" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."saved_bank_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "stripePaymentMethodId" text NOT NULL,
        "bankName" text NOT NULL,
        "last4" text NOT NULL,
        "fingerprint" text,
        "verified" boolean NOT NULL DEFAULT false,
        "verifiedAt" TIMESTAMP WITH TIME ZONE,
        "failedVerificationAttempts" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_2743b7a78c6a150057f132a8858" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_45539e66572b8c194f5a9722d9" ON "checkout"."saved_bank_accounts" ("userId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."wire_transfers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "contractId" uuid,
        "clientId" uuid NOT NULL,
        "referenceCode" text NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "status" "checkout"."wire_transfers_status_enum" NOT NULL DEFAULT 'pending',
        "wireConfirmedBy" text,
        "wireConfirmedAt" TIMESTAMP WITH TIME ZONE,
        "quickBooksInvoiceId" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_c7680b0ea1ce02e6eb1ba09beba" UNIQUE ("referenceCode"),
        CONSTRAINT "PK_0c28b5f4d01d39f13ce89d344da" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout"."stripe_metadata" (
        "stripeSessionId" text NOT NULL,
        "paymentIntentId" text,
        "customerId" text,
        "clientId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "contractId" uuid,
        "amount" integer NOT NULL,
        "currency" text NOT NULL DEFAULT 'USD',
        "paymentMethod" text NOT NULL,
        "billingType" text NOT NULL,
        "subscriptionId" text,
        "paidAt" TIMESTAMP WITH TIME ZONE,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "paymentStatus" text NOT NULL DEFAULT 'pending',
        "verificationStatus" text NOT NULL DEFAULT 'unverified',
        "wireTransferConfirmed" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_9777e8df632b10567bb4434502d" PRIMARY KEY ("stripeSessionId")
      )
    `);
  }

  public async down(): Promise<void> {
    return;
  }
}
