import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppealsAndLogFields1710000000001 implements MigrationInterface {
  name = 'AddAppealsAndLogFields1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add fieldType and mediaUrl columns to moderation_logs
    await queryRunner.query(`
      ALTER TABLE moderation_logs
        ADD COLUMN IF NOT EXISTS "fieldType" VARCHAR,
        ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT
    `);

    // Create appeal_status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE appeal_status_enum AS ENUM ('pending', 'approved', 'rejected', 'request_edits');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create moderation_appeals table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS moderation_appeals (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "contentId" VARCHAR NOT NULL,
        "userId" VARCHAR NOT NULL,
        reason TEXT NOT NULL,
        status appeal_status_enum NOT NULL DEFAULT 'pending',
        "moderatorComments" TEXT,
        "reviewedBy" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "reviewedAt" TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_appeals_content_id ON moderation_appeals ("contentId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_appeals_user_id ON moderation_appeals ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_appeals_status ON moderation_appeals (status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS moderation_appeals`);
    await queryRunner.query(`DROP TYPE IF EXISTS appeal_status_enum`);
    await queryRunner.query(`ALTER TABLE moderation_logs DROP COLUMN IF EXISTS "fieldType"`);
    await queryRunner.query(`ALTER TABLE moderation_logs DROP COLUMN IF EXISTS "mediaUrl"`);
  }
}
