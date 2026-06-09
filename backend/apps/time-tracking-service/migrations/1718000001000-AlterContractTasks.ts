import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterContractTasks1718000001000 implements MigrationInterface {
  name = 'AlterContractTasks1718000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change PK from uuid to text (drop default uuid generation)
    await queryRunner.query(`
      ALTER TABLE time_tracking.contract_tasks
        ALTER COLUMN id TYPE text,
        ALTER COLUMN id DROP DEFAULT
    `);

    // Change archived from boolean to int
    await queryRunner.query(`
      ALTER TABLE time_tracking.contract_tasks
        ALTER COLUMN archived TYPE int USING (CASE WHEN archived THEN 1 ELSE 0 END),
        ALTER COLUMN archived SET DEFAULT 0
    `);

    // Add mirrored_at column if not exists
    await queryRunner.query(`
      ALTER TABLE time_tracking.contract_tasks
        ADD COLUMN IF NOT EXISTS mirrored_at bigint
    `);

    // Drop removed columns if they exist
    await queryRunner.query(`
      ALTER TABLE time_tracking.contract_tasks
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS created_at,
        DROP COLUMN IF EXISTS updated_at
    `);
  }

  /**
   * Intentionally irreversible — task IDs are now app-generated text strings
   * (e.g. "task-con_marketing-1718000000000") which cannot be cast back to uuid.
   * Restore from backup if rollback is needed.
   */
  public async down(): Promise<void> {
    throw new Error(
      'Migration 1718000001000-AlterContractTasks is intentionally irreversible. ' +
      'Task IDs are now text-based and cannot be safely cast back to uuid. Restore from backup.',
    );
  }
}