import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `companies` and `company_users` tables that back the MyTeam
 * epic's multi-tenant org model (docs "MyTeam Epic — Backend Documentation
 * (SOP B)"). Additive only: no existing table is altered or dropped.
 *
 * Every identifier is schema-qualified with "user_service": raw
 * queryRunner.query() calls do not inherit the DataSource's `schema: '...'`
 * option as a search_path (verified locally: an earlier unqualified version
 * of this migration landed both tables in `public` instead), matching the
 * qualification already used elsewhere in this file's migration history
 * (e.g. AddResumeEntities1753400000000).
 */
export class CreateCompaniesSchema1796600000000 implements MigrationInterface {
  name = 'CreateCompaniesSchema1796600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_service"."companies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "domain" character varying(255),
        "logo_url" text,
        "owner_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_companies_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_companies_domain_unique"
       ON "user_service"."companies" ("domain") WHERE "domain" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_companies_owner_user_id" ON "user_service"."companies" ("owner_user_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_service"."company_users" (
        "company_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" character varying(50) NOT NULL DEFAULT 'viewer',
        "permissions" text[] NOT NULL DEFAULT '{}',
        "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_users_company_id_user_id" PRIMARY KEY ("company_id", "user_id"),
        CONSTRAINT "FK_company_users_company_id" FOREIGN KEY ("company_id")
          REFERENCES "user_service"."companies" ("id") ON DELETE CASCADE
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_company_users_company" ON "user_service"."company_users" ("company_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_company_users_user" ON "user_service"."company_users" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "user_service"."idx_company_users_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "user_service"."idx_company_users_company"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service"."company_users"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "user_service"."IDX_companies_owner_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "user_service"."IDX_companies_domain_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service"."companies"`);
  }
}
