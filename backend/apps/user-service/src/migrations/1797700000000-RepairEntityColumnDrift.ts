import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds columns the entities declare but no migration ever created.
 *
 * Found by comparing every `*.entity.ts` in this service against
 * `information_schema.columns`. On a database built from the migration chain,
 * TypeORM selects columns that are not there and the query fails with 42703.
 * The `education` one is the most damaging: `User` relates to it as
 * `educations`, so `getUserById` — and therefore `PATCH /v1/users/:id` — fails
 * for every user, which is why the Settings profile form could not save.
 *
 *   education.updatedAt          @UpdateDateColumn, never created
 *   certifications.issuerLogoUrl @Column, never created
 *   user_industries.createdAt    @CreateDateColumn, never created
 *   user_industries.updatedAt    @UpdateDateColumn, never created
 *
 * Timestamps default to `now()` so existing rows get a sensible value rather
 * than null, matching how the date decorators behave on insert.
 *
 * Deliberately NOT included: `tax_info.submittedAt`, which has the same drift.
 * `apps/user-service/src/tax-info/` is frozen directory-wide per CLAUDE.md and
 * emits real IRS documents, so that one is reported rather than changed.
 *
 * Schema-qualified on purpose: an unqualified ALTER TABLE lands in `public`,
 * not the service schema.
 */
export class RepairEntityColumnDrift1797700000000 implements MigrationInterface {
  name = 'RepairEntityColumnDrift1797700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.education
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE user_service.certifications
        ADD COLUMN IF NOT EXISTS "issuerLogoUrl" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE user_service.user_industries
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.user_industries
        DROP COLUMN IF EXISTS "createdAt",
        DROP COLUMN IF EXISTS "updatedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE user_service.certifications
        DROP COLUMN IF EXISTS "issuerLogoUrl"
    `);
    await queryRunner.query(`
      ALTER TABLE user_service.education
        DROP COLUMN IF EXISTS "updatedAt"
    `);
  }
}
