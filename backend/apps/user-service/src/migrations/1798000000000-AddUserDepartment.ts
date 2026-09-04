import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives Personal Info's "What team do you work on?" a column of its own.
 *
 * The field was collected and never submitted, because the obvious column was
 * already taken and taking it would have corrupted other data. `teamName` holds
 * the client's **company name** — `complete-client-profile` writes
 * `updateProfile(userId, { teamName: values.companyName })` and the user entity
 * documents it as such — while this field is a department: its options are
 * Engineering, Design, Marketing, Sales, Operations and Product. Writing one to
 * the other means saving Personal Info silently replaces the company name.
 *
 * Named `department` rather than `team` to keep that distinction obvious at the
 * call site. `teamName` stays exactly as it is.
 *
 * Stored as text, not an enum: the option list is a product decision that can
 * change, an enum would need a migration each time, and a stored value dropped
 * from the list would break the read rather than simply displaying.
 *
 * Schema-qualified: an unqualified ALTER TABLE lands in `public`, not the
 * service schema.
 */
export class AddUserDepartment1798000000000 implements MigrationInterface {
  name = 'AddUserDepartment1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.users
        ADD COLUMN IF NOT EXISTS "department" character varying(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.users
        DROP COLUMN IF EXISTS "department"
    `);
  }
}
