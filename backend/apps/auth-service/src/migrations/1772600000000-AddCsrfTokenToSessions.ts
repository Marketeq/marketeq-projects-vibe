import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCsrfTokenToSessions1772600000000
  implements MigrationInterface
{
  name = 'AddCsrfTokenToSessions1772600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "csrfToken" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "csrfToken"`,
    );
  }
}
