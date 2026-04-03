import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractLabelCache1700000004000 implements MigrationInterface {
  name = 'CreateContractLabelCache1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE contract_label_cache (
        contract_id          UUID         NOT NULL,
        contractor_id        UUID         NOT NULL,
        client_id            UUID         NOT NULL,
        project_id           UUID,
        contract_title       VARCHAR(255),
        project_name         VARCHAR(255),
        client_display_name  VARCHAR(255),
        status               VARCHAR(20)  NOT NULL DEFAULT 'active',
        activated_at         TIMESTAMPTZ  NOT NULL,
        ended_at             TIMESTAMPTZ,
        created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT contract_label_cache_pkey PRIMARY KEY (contract_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_contract_label_contractor ON contract_label_cache (contractor_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS contract_label_cache;`);
  }
}
