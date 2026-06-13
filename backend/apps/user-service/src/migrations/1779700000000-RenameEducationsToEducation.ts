import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameEducationsToEducation1779700000000 implements MigrationInterface {
  name = 'RenameEducationsToEducation1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename user_service.educations → user_service.education to match the entity decorator.
    // Idempotent: no-ops if the table is already named 'education' or doesn't exist.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_tables
          WHERE schemaname = 'user_service' AND tablename = 'educations'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_tables
          WHERE schemaname = 'user_service' AND tablename = 'education'
        ) THEN
          ALTER TABLE user_service.educations RENAME TO education;
        END IF;
      END;
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_tables
          WHERE schemaname = 'user_service' AND tablename = 'education'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_tables
          WHERE schemaname = 'user_service' AND tablename = 'educations'
        ) THEN
          ALTER TABLE user_service.education RENAME TO educations;
        END IF;
      END;
      $$
    `);
  }
}
