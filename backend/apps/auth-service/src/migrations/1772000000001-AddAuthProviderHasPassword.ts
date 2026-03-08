import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthProviderHasPassword1772000000001 implements MigrationInterface {
  name = 'AddAuthProviderHasPassword1772000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" character varying NOT NULL DEFAULT 'EMAIL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasPassword" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "hasPassword" = true WHERE "hasPassword" IS DISTINCT FROM true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "hasPassword"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "provider"`,
    );
  }
}
