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

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore removed columns
    await queryRunner.query(`
      ALTER TABLE time_tracking.contract_tasks
        ADD COLUMN IF NOT EXISTS created_by text,
        ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
    `);

    // Revert archived back to boolean
    await queryRunner.query(`
      ALTER TABLE time_tracking.contract_tasks
        ALTER COLUMN archived TYPE boolean USING (archived != 0),
        ALTER COLUMN archived SET DEFAULT false
    `);

    // Drop mirrored_at
    await queryRunner.query(`
      ALTER TABLE time_tracking.contract_tasks
        DROP COLUMN IF EXISTS mirrored_at
    `);

    // Revert PK back to uuid with default
    await queryRunner.query(`
      ALTER TABLE time_tracking.contract_tasks
        ALTER COLUMN id TYPE uuid USING id::uuid,
        ALTER COLUMN id SET DEFAULT gen_random_uuid()
    `);
  }
}