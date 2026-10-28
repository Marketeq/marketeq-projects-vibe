import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrders1792600000000 implements MigrationInterface {
  name = 'CreateOrders1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE "checkout"."order_number_seq"
        AS bigint
        MINVALUE 100000000
        MAXVALUE 999999999
        START WITH 100000000
        NO CYCLE
    `);
    await queryRunner.query(`
      CREATE FUNCTION "checkout"."next_order_id"() RETURNS varchar AS $$
        SELECT 'C01-' || substr(n::text, 1, 5) || '-' || substr(n::text, 6, 4)
        FROM (SELECT nextval('checkout.order_number_seq') AS n) s
      $$ LANGUAGE sql VOLATILE
    `);
    await queryRunner.query(`
      CREATE TYPE "checkout"."orders_status_enum"
        AS ENUM ('processing', 'paid', 'failed')
    `);
    await queryRunner.query(`
      CREATE TABLE "checkout"."orders" (
        "orderId" character varying(14) NOT NULL DEFAULT "checkout"."next_order_id"(),
        "sessionId" uuid NOT NULL,
        "clientId" character varying NOT NULL,
        "listingId" character varying NOT NULL,
        "status" "checkout"."orders_status_enum" NOT NULL DEFAULT 'processing',
        "orderCost" numeric(10,2) NOT NULL,
        "confirmationEmail" character varying NULL,
        "paidAt" TIMESTAMP WITH TIME ZONE NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_orderId" PRIMARY KEY ("orderId"),
        CONSTRAINT "UQ_orders_sessionId" UNIQUE ("sessionId"),
        CONSTRAINT "FK_orders_session" FOREIGN KEY ("sessionId")
          REFERENCES "checkout"."sessions"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_orders_orderId_format"
          CHECK ("orderId" ~ '^C01-[0-9]{5}-[0-9]{4}$'),
        CONSTRAINT "CHK_orders_orderCost" CHECK ("orderCost" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_clientId_createdAt"
      ON "checkout"."orders" ("clientId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "checkout"."orders"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "checkout"."orders_status_enum"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "checkout"."next_order_id"()`,
    );
    await queryRunner.query(
      `DROP SEQUENCE IF EXISTS "checkout"."order_number_seq"`,
    );
  }
}
