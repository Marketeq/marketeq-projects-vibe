import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings time_tracking.contract_tasks back in line with the ContractTask
 * entity (src/entities/contract-task.entity.ts).
 *
 * 1718000001000-AlterContractTasks reshaped this table into the desktop
 * app's SQLite mirror layout (text id, int archived, no created_by /
 * created_at / updated_at, extra mirrored_at). The entity was later moved
 * back to the 1715000000000 layout (boolean archived, created_by,
 * timestamps) without a migration, so on any database that ran the full
 * chain every task query fails:
 *
 *   column ContractTask.created_by does not exist
 *
 * which is what surfaced as "Database error" on GET /tasks/contract/:id and
 * POST /tasks — tasks could not be listed or created from web or desktop.
 *
 * Every step is guarded so this is safe on both shapes: a database still in
 * the 1715 layout (or repaired by hand) is left as it is.
 *
 * `id` deliberately stays text where it already is. Existing task ids are
 * app-generated strings ("task-seed-a-1", ...) and are referenced as text by
 * sessions.task_id, manual_time.task_id and screenshots.task_id; converting
 * to uuid would re-key live rows. A gen_random_uuid() default is enough for
 * the entity's @PrimaryGeneratedColumn('uuid') to insert new rows.
 *
 * `mirrored_at` is left in place: it is nullable, unused by the entity, and
 * dropping it gains nothing.
 */
export class ReconcileContractTasksWithEntity1790150400000
  implements MigrationInterface
{
  name = 'ReconcileContractTasksWithEntity1790150400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        -- archived: int (0/1) -> boolean
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'time_tracking' AND table_name = 'contract_tasks'
            AND column_name = 'archived' AND data_type = 'integer'
        ) THEN
          ALTER TABLE time_tracking.contract_tasks ALTER COLUMN archived DROP DEFAULT;
          ALTER TABLE time_tracking.contract_tasks
            ALTER COLUMN archived TYPE boolean USING (archived <> 0);
          ALTER TABLE time_tracking.contract_tasks ALTER COLUMN archived SET DEFAULT false;
        END IF;

        -- id: text with no default -> generate one for new rows
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'time_tracking' AND table_name = 'contract_tasks'
            AND column_name = 'id' AND data_type = 'text' AND column_default IS NULL
        ) THEN
          ALTER TABLE time_tracking.contract_tasks
            ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
        END IF;

        -- created_by: the creator is unknown for rows that predate this
        -- column, so they get an empty string; new rows always supply it.
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'time_tracking' AND table_name = 'contract_tasks'
            AND column_name = 'created_by'
        ) THEN
          ALTER TABLE time_tracking.contract_tasks
            ADD COLUMN created_by text NOT NULL DEFAULT '';
          ALTER TABLE time_tracking.contract_tasks ALTER COLUMN created_by DROP DEFAULT;
        END IF;
      END $$;
    `);

    // Guarded like the steps above rather than with ADD COLUMN IF NOT EXISTS:
    // Postgres checks table ownership before it evaluates IF NOT EXISTS, and on
    // the live DB contract_tasks is owned by supabase_admin, not the app role.
    // An unguarded ALTER there fails with "must be owner" even when both
    // columns already exist, and with migrationsRun that stops the service
    // from booting.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'time_tracking' AND table_name = 'contract_tasks'
            AND column_name = 'created_at'
        ) THEN
          ALTER TABLE time_tracking.contract_tasks
            ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'time_tracking' AND table_name = 'contract_tasks'
            AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE time_tracking.contract_tasks
            ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
        END IF;
      END $$;
    `);
  }

  /**
   * Intentionally irreversible, like 1718000001000 before it: going back
   * means re-breaking the table against the entity that ships with it.
   */
  public async down(): Promise<void> {
    // no-op. See the note above.
  }
}
