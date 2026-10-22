import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backs `idempotencyKey` on `notification.send`: the key is the primary key, so a
 * second claim of the same key conflicts instead of dispatching again. Unqualified
 * name, matching this service's other migrations.
 */
export class CreateNotificationIdempotency1798400000000 implements MigrationInterface {
  name = 'CreateNotificationIdempotency1798400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_idempotency" (
        "key" character varying(255) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_idempotency" PRIMARY KEY ("key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_idempotency"`);
  }
}
