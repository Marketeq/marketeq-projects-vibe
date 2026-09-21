import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Privacy settings table — stores per-user talent and client privacy
 * preferences as JSONB columns.
 */
export class CreatePrivacySettings1799400000000 implements MigrationInterface {
  name = 'CreatePrivacySettings1799400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.privacy_settings (
        id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid          NOT NULL,
        talent      jsonb,
        client      jsonb,
        created_at  timestamptz   NOT NULL DEFAULT now(),
        updated_at  timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT uq_privacy_settings_user_id UNIQUE (user_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id
        ON user_service.privacy_settings (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_service.privacy_settings
    `);
  }
}
