import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractTasks1715000000000 implements MigrationInterface {
  name = 'CreateContractTasks1715000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS time_tracking.contract_tasks (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id  text NOT NULL,
        name         text NOT NULL,
        archived     boolean NOT NULL DEFAULT false,
        created_by   text NOT NULL,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      )
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_contract_tasks_contract ON time_tracking.contract_tasks (contract_id)`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS time_tracking.contract_tasks`);
  }
}
