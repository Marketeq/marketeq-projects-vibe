import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePersistentStatusAlerts1799900000000 implements MigrationInterface {
  name = 'CreatePersistentStatusAlerts1799900000000';

  // timestamptz, not TIMESTAMP: the dashboard orders these against the browser's clock, and a
  // zone-less value is read back in the server's local zone (hours off on any non-UTC host).
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "persistent_status_alerts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" character varying NOT NULL,
        "type" character varying(64) NOT NULL,
        "occurrenceKey" character varying(200) NOT NULL,
        "title" character varying NOT NULL,
        "body" text NOT NULL,
        "link" character varying,
        "metadata" jsonb,
        "dismissedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_persistent_status_alerts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_persistent_status_alert_occurrence"
          UNIQUE ("userId", "type", "occurrenceKey")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_persistent_status_alerts_active"
        ON "persistent_status_alerts" ("userId", "dismissedAt", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_persistent_status_alerts_active"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "persistent_status_alerts"`);
  }
}
