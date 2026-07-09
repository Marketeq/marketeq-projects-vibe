import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditTable1761269270292 implements MigrationInterface {
    name = 'AddAuditTable1761269270292'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_contracts_groupId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_contracts_clientId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_contracts_talentId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_contracts_status"`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."contracts_status_enum" AS ENUM('pending', 'active', 'ended', 'canceled')`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD "status" "public"."contracts_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "contract_groups" DROP COLUMN "type"`);
        await queryRunner.query(`CREATE TYPE "public"."contract_groups_type_enum" AS ENUM('project', 'service', 'team', 'job')`);
        await queryRunner.query(`ALTER TABLE "contract_groups" ADD "type" "public"."contract_groups_type_enum" NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_groups" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."contract_groups_type_enum"`);
        await queryRunner.query(`ALTER TABLE "contract_groups" ADD "type" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."contracts_status_enum"`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD "status" character varying NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`CREATE INDEX "IDX_contracts_status" ON "contracts" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_contracts_talentId" ON "contracts" ("talentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_contracts_clientId" ON "contracts" ("clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_contracts_groupId" ON "contracts" ("groupId") `);
    }

}
