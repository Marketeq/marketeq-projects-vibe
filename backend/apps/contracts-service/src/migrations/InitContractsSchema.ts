import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitContractsSchema1234567890123 implements MigrationInterface {
  name = 'InitContractsSchema1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create contract_groups table
    await queryRunner.query(`
      CREATE TABLE "contract_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying NOT NULL,
        "ownerClientId" character varying NOT NULL,
        "projectId" character varying,
        "serviceId" character varying,
        "teamId" character varying,
        "jobId" character varying,
        "depositPaid" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contract_groups" PRIMARY KEY ("id")
      )
    `);

    // Create contracts table
    await queryRunner.query(`
      CREATE TABLE "contracts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "groupId" character varying NOT NULL,
        "clientId" character varying NOT NULL,
        "talentId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "rate" numeric(10,2) NOT NULL,
        "schedule" character varying NOT NULL,
        "duration" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "startAtISO" character varying,
        "endAtISO" character varying,
        "projectId" character varying,
        "serviceId" character varying,
        "teamId" character varying,
        "jobId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contracts" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_contracts_groupId" ON "contracts" ("groupId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contracts_clientId" ON "contracts" ("clientId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contracts_talentId" ON "contracts" ("talentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contracts_status" ON "contracts" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_contracts_status"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_talentId"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_clientId"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_groupId"`);
    await queryRunner.query(`DROP TABLE "contracts"`);
    await queryRunner.query(`DROP TABLE "contract_groups"`);
  }
}
