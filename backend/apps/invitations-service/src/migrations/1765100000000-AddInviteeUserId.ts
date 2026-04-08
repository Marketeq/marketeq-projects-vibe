import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInviteeUserId1765100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invitations"
      ADD COLUMN IF NOT EXISTS "invitee_user_id" uuid NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invitations"
      DROP COLUMN IF EXISTS "invitee_user_id"
    `);
  }
}
