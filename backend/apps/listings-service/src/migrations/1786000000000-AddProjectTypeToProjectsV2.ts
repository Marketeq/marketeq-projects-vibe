import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTypeToProjectsV21786000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects_v2" ADD COLUMN IF NOT EXISTS "projectType" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects_v2" DROP COLUMN IF EXISTS "projectType"`,
    );
  }
}
