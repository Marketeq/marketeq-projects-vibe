import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitContractsSchema1710000000000 implements MigrationInterface {
  name = 'InitContractsSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "contract_groups_type_enum" AS ENUM('project', 'service', 'team', 'job')
    `);

    await queryRunner.query(`
      CREATE TYPE "contracts_status_enum" AS ENUM('pending', 'active', 'ended', 'canceled', 'disputed')
    `);

    await queryRunner.query(`
      CREATE TABLE "contract_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "contract_groups_type_enum" NOT NULL,
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

    await queryRunner.query(`
      CREATE TABLE "contracts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "groupId" uuid NOT NULL,
        "clientId" character varying NOT NULL,
        "talentId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "rate" numeric(10,2) NOT NULL,
        "schedule" character varying NOT NULL,
        "duration" character varying NOT NULL,
        "status" "contracts_status_enum" NOT NULL DEFAULT 'pending',
        "startAtISO" character varying,
        "endAtISO" character varying,
        "reasonCode" character varying,
        "notes" text,
        "projectId" character varying,
        "serviceId" character varying,
        "teamId" character varying,
        "jobId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contracts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contracts_groupId" FOREIGN KEY ("groupId") REFERENCES "contract_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contract_audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "role" character varying NOT NULL,
        "action" character varying NOT NULL,
        "contractId" character varying,
        "groupId" character varying,
        "details" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contract_audits" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_contracts_groupId" ON "contracts" ("groupId")`);
    await queryRunner.query(`CREATE INDEX "IDX_contracts_clientId" ON "contracts" ("clientId")`);
    await queryRunner.query(`CREATE INDEX "IDX_contracts_talentId" ON "contracts" ("talentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_contracts_status" ON "contracts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_contract_audits_contractId" ON "contract_audits" ("contractId")`);
    await queryRunner.query(`CREATE INDEX "IDX_contract_audits_groupId" ON "contract_audits" ("groupId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_contract_audits_groupId"`);
    await queryRunner.query(`DROP INDEX "IDX_contract_audits_contractId"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_status"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_talentId"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_clientId"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_groupId"`);
    await queryRunner.query(`DROP TABLE "contract_audits"`);
    await queryRunner.query(`DROP TABLE "contracts"`);
    await queryRunner.query(`DROP TABLE "contract_groups"`);
    await queryRunner.query(`DROP TYPE "contracts_status_enum"`);
    await queryRunner.query(`DROP TYPE "contract_groups_type_enum"`);
  }
}
