import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `updatedAt` column the `Experience` entity declares but no migration
 * ever created.
 *
 * `experience.entity.ts` carries an `@UpdateDateColumn updatedAt`, and `User`
 * relates to it as `experiences`. The only migration that creates the table —
 * `AddTalentProfile1777519381417` — omits the column, so on any database built
 * from the migration chain TypeORM selects a column that is not there:
 *
 *     42703: column User__User_experiences.updatedAt does not exist
 *
 * That fires on every query that loads a user with their experiences, which
 * includes `getUserById`. The practical effect is that `PATCH /v1/users/:id`
 * returns a 400 for every user, so the Settings profile form cannot save at
 * all.
 *
 * Defaulted to `now()` so existing rows get a sensible value rather than null,
 * matching how `@UpdateDateColumn` behaves on insert.
 *
 * Schema-qualified on purpose: an unqualified ALTER TABLE lands in `public`,
 * not the service schema.
 */
export class AddExperienceUpdatedAt1797600000000 implements MigrationInterface {
  name = 'AddExperienceUpdatedAt1797600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.experience
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.experience
        DROP COLUMN IF EXISTS "updatedAt"
    `);
  }
}
