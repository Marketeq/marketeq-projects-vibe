import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookLogs1710000000001 implements MigrationInterface {
  name = 'AddWebhookLogs1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_webhook_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "stripeEventId" VARCHAR NOT NULL,
        "eventType" VARCHAR NOT NULL,
        payload JSONB NOT NULL,
        "processingStatus" VARCHAR NOT NULL DEFAULT 'received',
        "errorMessage" TEXT,
        "receivedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON billing_webhook_logs ("stripeEventId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON billing_webhook_logs ("eventType")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS billing_webhook_logs`);
  }
}
