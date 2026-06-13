import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetVersionToUsers1772400000000
  implements MigrationInterface
{
  name = 'AddPasswordResetVersionToUsers1772400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetVersion" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordResetVersion"`,
    );
  }
}
