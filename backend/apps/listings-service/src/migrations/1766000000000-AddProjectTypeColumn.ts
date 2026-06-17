import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTypeColumn1766000000000 implements MigrationInterface {
  name = 'AddProjectTypeColumn1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE listings."projects_v2"
      ADD COLUMN IF NOT EXISTS "projectType" text DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE listings."projects_v2"
      DROP COLUMN IF EXISTS "projectType"
    `);
  }
}
