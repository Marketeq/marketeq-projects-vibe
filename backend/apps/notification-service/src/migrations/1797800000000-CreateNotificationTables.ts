import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the two tables this service's entities expect and that no migration
 * ever produced.
 *
 * The existing chain is recorded as run but builds nothing:
 * `InitSchema1710000000000` has an empty `up()` ("tables already exist via
 * synchronize") and `ExpandNotificationPreferences1776700000000` opens with
 * `if (!hasTable) return`. Both assume `synchronize: true`, which the SOP
 * forbids and this service disables. The result is that Settings >
 * Notifications renders its error card on every environment built from
 * migrations: the screen is finished, it simply has nothing to read.
 *
 * Deliberately unqualified. The runtime connection resolves its schema as
 * `DATABASE_SCHEMA || 'public'` while the CLI data-source defaults to
 * `notifications`, so a schema-qualified statement would create the tables
 * where whoever ran it happened to point rather than where the service reads.
 * Leaving them unqualified puts the tables in the connection's own schema,
 * which is the one the entities are bound to. The runtime carries
 * `migrationsRun: true`, so it applies this itself at boot and lands in the
 * right place without anyone running the CLI.
 *
 * `IF NOT EXISTS` throughout because this has to be safe on databases where an
 * older `synchronize: true` boot already created some of it.
 */
export class CreateNotificationTables1797800000000
  implements MigrationInterface
{
  name = 'CreateNotificationTables1797800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `gen_random_uuid()` is built into PostgreSQL 13+ and needs no extension,
    // unlike `uuid_generate_v4()` which requires uuid-ossp to be installed.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" character varying NOT NULL,
        "inAppEnabled" boolean NOT NULL DEFAULT true,
        "emailEnabled" boolean NOT NULL DEFAULT true,
        "smsEnabled" boolean NOT NULL DEFAULT false,
        "disabledCategories" text,
        "channels" jsonb,
        "categories" jsonb,
        "notifications" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences_id" PRIMARY KEY ("id")
      )
    `);

    // The entity declares userId unique, and the service reads a person's
    // preferences by it. Without the constraint a second row for the same user
    // is possible and whichever one is returned first wins.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_notification_preferences_userId"
        ON "notification_preferences" ("userId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "body" character varying NOT NULL,
        "link" character varying,
        "category" character varying NOT NULL,
        "event" character varying,
        "metadata" jsonb,
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP,
        "isArchived" boolean NOT NULL DEFAULT false,
        "origin" character varying NOT NULL DEFAULT 'system',
        "scheduledTime" TIMESTAMP,
        "createdBy" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      )
    `);

    // Every read is "this user's notifications, newest first".
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_userId_createdAt"
        ON "notifications" ("userId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_userId_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_notification_preferences_userId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preferences"`);
  }
}
