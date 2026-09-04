import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the six Company Info fields that had no column anywhere.
 *
 * Settings > Company Info collects eight values. Only name, website and logo
 * had somewhere to go, so the other six were deliberately left out of the
 * payload rather than sent and silently dropped — the form kept them for the
 * session and they vanished on reload.
 *
 * They land on `companies` rather than the user row because company data is
 * shared: two people at the same company editing their own user row would
 * produce two divergent copies with no way to reconcile them. `company_users`
 * already carries roles, which is what makes the admin-only rule for
 * account-level settings enforceable.
 *
 * All nullable — company name is the only required field, so requiring revenue
 * or headcount to save a settings form would add friction for no operational
 * benefit.
 *
 * Stored as text rather than enums. Company size and annual revenue are
 * presented as ranges ("11-50", "$1M-$10M") whose buckets are a product
 * decision that has changed before; a Postgres enum would need a migration
 * every time the list is edited, and an unknown stored value would break the
 * read.
 *
 * snake_case column names to match the existing `logo_url` / `owner_user_id`
 * mapping on this entity. Schema-qualified: an unqualified ALTER TABLE lands in
 * `public`, not the service schema.
 */
export class AddCompanyProfileFields1797900000000 implements MigrationInterface {
  name = 'AddCompanyProfileFields1797900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.companies
        ADD COLUMN IF NOT EXISTS "industry" character varying(255),
        ADD COLUMN IF NOT EXISTS "business_type" character varying(255),
        ADD COLUMN IF NOT EXISTS "company_size" character varying(255),
        ADD COLUMN IF NOT EXISTS "annual_revenue" character varying(255),
        ADD COLUMN IF NOT EXISTS "phone" character varying(50),
        ADD COLUMN IF NOT EXISTS "time_zone" character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.companies
        DROP COLUMN IF EXISTS "industry",
        DROP COLUMN IF EXISTS "business_type",
        DROP COLUMN IF EXISTS "company_size",
        DROP COLUMN IF EXISTS "annual_revenue",
        DROP COLUMN IF EXISTS "phone",
        DROP COLUMN IF EXISTS "time_zone"
    `);
  }
}
