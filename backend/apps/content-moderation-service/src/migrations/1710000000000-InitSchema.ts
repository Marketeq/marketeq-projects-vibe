import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE moderation_action_enum AS ENUM ('approved', 'flagged', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE content_type_enum AS ENUM ('project', 'review', 'profile', 'listing', 'message', 'media');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // moderation_logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "contentId" VARCHAR NOT NULL,
        "contentType" content_type_enum NOT NULL,
        action moderation_action_enum NOT NULL,
        reason TEXT,
        "moderatorId" TEXT,
        meta JSONB,
        timestamp TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_modlogs_content_id ON moderation_logs ("contentId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_modlogs_action ON moderation_logs (action)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_modlogs_content_type ON moderation_logs ("contentType")`);

    // banned_keywords
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS banned_keywords (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        keyword VARCHAR NOT NULL UNIQUE,
        category VARCHAR,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS banned_keywords`);
    await queryRunner.query(`DROP TABLE IF EXISTS moderation_logs`);
    await queryRunner.query(`DROP TYPE IF EXISTS content_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS moderation_action_enum`);
  }
}
