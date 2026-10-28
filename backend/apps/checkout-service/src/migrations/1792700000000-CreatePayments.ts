import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1792700000000 implements MigrationInterface {
  name = 'CreatePayments1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "checkout"."payments_phase_enum"
        AS ENUM ('initial', 'recurring')
    `);
    await queryRunner.query(`
      CREATE TYPE "checkout"."payments_method_enum"
        AS ENUM ('card', 'ach', 'wire', 'google_pay', 'apple_pay', 'klarna')
    `);
    await queryRunner.query(`
      CREATE TYPE "checkout"."payments_status_enum"
        AS ENUM ('pending', 'processing', 'paid', 'failed', 'active', 'inactive')
    `);
    await queryRunner.query(`
      CREATE TABLE "checkout"."payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sessionId" uuid NOT NULL,
        "phase" "checkout"."payments_phase_enum" NOT NULL DEFAULT 'initial',
        "method" "checkout"."payments_method_enum" NOT NULL,
        "savedMethodId" uuid NULL,
        "amount" numeric(10,2) NOT NULL,
        "status" "checkout"."payments_status_enum" NOT NULL DEFAULT 'pending',
        "stripePaymentIntentId" character varying NULL,
        "stripeSubscriptionId" character varying NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_stripePaymentIntentId"
          UNIQUE ("stripePaymentIntentId"),
        CONSTRAINT "UQ_payments_stripeSubscriptionId"
          UNIQUE ("stripeSubscriptionId"),
        CONSTRAINT "FK_payments_session" FOREIGN KEY ("sessionId")
          REFERENCES "checkout"."sessions"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_payments_amount" CHECK ("amount" > 0),
        CONSTRAINT "CHK_payments_savedMethodId"
          CHECK ("savedMethodId" IS NULL OR "method" IN ('card', 'ach')),
        CONSTRAINT "CHK_payments_stripe_ids" CHECK (
          ("stripePaymentIntentId" IS NULL OR "phase" = 'initial')
          AND ("stripeSubscriptionId" IS NULL OR "phase" = 'recurring')
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payments_sessionId"
      ON "checkout"."payments" ("sessionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "checkout"."payments"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "checkout"."payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "checkout"."payments_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "checkout"."payments_phase_enum"`,
    );
  }
}
