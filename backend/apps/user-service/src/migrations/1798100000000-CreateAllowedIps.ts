import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Storage for Settings > IP Restrictions.
 *
 * The screen was fully built but entirely client-side: the list lived in React
 * state and every entry was lost on reload, including CSV imports of hundreds
 * of addresses.
 *
 * `address` is text rather than `inet` or `cidr`. The screen accepts both a
 * single address and a range typed as "from - to", and renders the value back
 * exactly as entered; the Postgres types would force a normalised form and a
 * second column, and would reject a partially typed range outright.
 *
 * `company_id` is nullable and nothing writes it yet. Whether the allow-list is
 * personal or account-wide is unanswered; having the column from the start
 * makes "account-wide" a query change plus a backfill instead of a migration
 * against a table already holding customer data.
 *
 * The unique constraint is on (user_id, address) rather than address alone —
 * two people may legitimately allow the same office IP.
 *
 * Schema-qualified: an unqualified CREATE TABLE lands in `public`, not the
 * service schema. Idempotent throughout, matching the convention #379
 * established for this service after the from-scratch chain broke.
 */
export class CreateAllowedIps1798100000000 implements MigrationInterface {
  name = 'CreateAllowedIps1798100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.allowed_ips (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "company_id" uuid,
        "address" character varying(255) NOT NULL,
        "description" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_allowed_ips_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_allowed_ips_user_address'
        ) THEN
          ALTER TABLE user_service.allowed_ips
            ADD CONSTRAINT "uq_allowed_ips_user_address" UNIQUE ("user_id", "address");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_allowed_ips_user_id"
        ON user_service.allowed_ips ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_allowed_ips_company_id"
        ON user_service.allowed_ips ("company_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS user_service."IDX_allowed_ips_company_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS user_service."IDX_allowed_ips_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS user_service.allowed_ips`);
  }
}
