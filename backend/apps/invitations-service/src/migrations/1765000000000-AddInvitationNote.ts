import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitationNote1765000000000 implements MigrationInterface {
  name = 'AddInvitationNote1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "note" text',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "invitations" DROP COLUMN IF EXISTS "note"',
    );
  }
}
