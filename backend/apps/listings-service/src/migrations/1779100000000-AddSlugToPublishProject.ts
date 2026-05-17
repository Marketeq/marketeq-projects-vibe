import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlugToPublishProject1779100000000 implements MigrationInterface {
  name = 'AddSlugToPublishProject1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "slug" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_publish_project_slug" ON "project" ("slug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_publish_project_slug"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN IF EXISTS "slug"`,
    );
  }
}
