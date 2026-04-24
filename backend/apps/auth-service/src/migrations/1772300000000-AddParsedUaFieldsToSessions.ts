import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParsedUaFieldsToSessions1772300000000
  implements MigrationInterface
{
  name = 'AddParsedUaFieldsToSessions1772300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "browserName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "browserVersion" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "osName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "osVersion" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "deviceType" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "deviceType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "osVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "osName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "browserVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "browserName"`,
    );
  }
}
