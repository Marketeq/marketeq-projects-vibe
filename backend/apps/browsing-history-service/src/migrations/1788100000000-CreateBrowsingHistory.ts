import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `gen_random_uuid()` is built into PostgreSQL 13+ and needs no extension,
 * unlike `uuid_generate_v4()` which requires uuid-ossp to be installed —
 * same reasoning as notification-service's CreateNotificationTables.
 *
 * Deliberately unqualified: the runtime connection resolves its schema as
 * `DATABASE_SCHEMA || 'public'` (browsing-history-service.module.ts), so an
 * unqualified statement lands the table in the connection's own schema —
 * the one the entity is bound to — rather than wherever the CLI's
 * data-source.ts happens to default to.
 *
 * `IF NOT EXISTS` throughout, and the enum creation guarded by an existence
 * check (Postgres has no `CREATE TYPE IF NOT EXISTS`), so this is safe to
 * re-run against a database where a prior partial run already landed part
 * of it.
 */
export class CreateBrowsingHistory1788100000000 implements MigrationInterface {
  name = 'CreateBrowsingHistory1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'browsing_history_itemtype_enum' AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "browsing_history_itemtype_enum" AS ENUM ('project', 'service', 'team', 'talent');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "browsing_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "itemId" character varying(100) NOT NULL,
        "itemType" "browsing_history_itemtype_enum" NOT NULL,
        "firstViewedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastViewedAt" TIMESTAMP NOT NULL,
        "viewCount" integer DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_browsing_history" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_browsing_history_user_item" UNIQUE ("userId", "itemId")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_browsing_history_userId" ON "browsing_history" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_browsing_history_userId_lastViewedAt" ON "browsing_history" ("userId", "lastViewedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "browsing_history"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "browsing_history_itemtype_enum"`);
  }
}
