import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToManualTime1714300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE time_tracking.manual_time
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE time_tracking.manual_time
      DROP COLUMN IF EXISTS deleted_at
    `);
  }
}
