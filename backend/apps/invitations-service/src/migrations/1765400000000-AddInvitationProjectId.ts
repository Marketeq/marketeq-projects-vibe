import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitationProjectId1765400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invitations"
      ADD COLUMN IF NOT EXISTS "project_id" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_invitations_project_id" ON "invitations" ("project_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_invitations_project_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "invitations"
      DROP COLUMN IF EXISTS "project_id"
    `);
  }
}
