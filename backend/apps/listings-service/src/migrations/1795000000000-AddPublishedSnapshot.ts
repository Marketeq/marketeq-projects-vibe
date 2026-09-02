import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublishedSnapshot1795000000000 implements MigrationInterface {
  name = 'AddPublishedSnapshot1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings"."project" ADD COLUMN IF NOT EXISTS "publishedSnapshot" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings"."project" DROP COLUMN IF EXISTS "publishedSnapshot"`,
    );
  }
}
