import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameProjectIdToContractId1716000000000 implements MigrationInterface {
  name = 'RenameProjectIdToContractId1716000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE time_tracking.screenshots RENAME COLUMN project_id TO contract_id`);
    await qr.query(`ALTER TABLE time_tracking.manual_time RENAME COLUMN project_id TO contract_id`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE time_tracking.screenshots RENAME COLUMN contract_id TO project_id`);
    await qr.query(`ALTER TABLE time_tracking.manual_time RENAME COLUMN contract_id TO project_id`);
  }
}
