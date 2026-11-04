import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Clears the boolean DEFAULT on time_tracking.contract_tasks.archived so that
 * the following migration (1718000001000-AlterContractTasks) can cast the
 * column to int.
 *
 * 1715000000000-CreateContractTasks creates the column as
 * `boolean NOT NULL DEFAULT false`. Postgres refuses to change the column type
 * while that default is attached, even though the same statement immediately
 * sets a new integer default:
 *
 *   ERROR: default for column "archived" cannot be cast automatically to type integer
 *
 * 1718000001000 therefore aborts on every database that has not already been
 * repaired by hand, which blocks the whole time-tracking migration chain
 * behind it. This migration is deliberately timestamped to sort *before*
 * 1718000001000 so it clears the default first and lets the already-shipped
 * migration run unmodified.
 *
 * It is a no-op where `archived` has already been converted to int. That
 * guard matters because databases repaired before this migration existed have
 * 1718000001000 recorded but not this one, so it still runs there and must not
 * strip the integer DEFAULT 0 that the conversion installed.
 */
export class DropContractTasksArchivedBooleanDefault1718000000500
  implements MigrationInterface
{
  name = 'DropContractTasksArchivedBooleanDefault1718000000500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'time_tracking'
            AND table_name   = 'contract_tasks'
            AND column_name  = 'archived'
            AND data_type    = 'boolean'
        ) THEN
          ALTER TABLE time_tracking.contract_tasks
            ALTER COLUMN archived DROP DEFAULT;
        END IF;
      END $$;
    `);
  }

  /**
   * Intentionally irreversible. Restoring the boolean default is only
   * meaningful if 1718000001000 is also rolled back, and that migration is
   * itself irreversible (task ids become app-generated text and cannot be cast
   * back to uuid). Reverting this alone would leave the column as int with no
   * default, which is worse than leaving it untouched.
   */
  public async down(): Promise<void> {
    // no-op. See the note above.
  }
}
