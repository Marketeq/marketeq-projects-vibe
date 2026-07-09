import { MigrationInterface, QueryRunner } from "typeorm";

export class InitContractsSchema1761575667451 implements MigrationInterface {
    name = 'InitContractsSchema1761575667451'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "groupId"`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD "groupId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD CONSTRAINT "FK_8738d9241715be3b519007907ed" FOREIGN KEY ("groupId") REFERENCES "contract_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" DROP CONSTRAINT "FK_8738d9241715be3b519007907ed"`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "groupId"`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD "groupId" character varying NOT NULL`);
    }

}
