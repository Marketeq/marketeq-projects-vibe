import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNoteToContracts1769803768421 implements MigrationInterface {
    name = 'AddNoteToContracts1769803768421'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" ADD "note" text`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "groupId"`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD "groupId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD CONSTRAINT "FK_8738d9241715be3b519007907ed" FOREIGN KEY ("groupId") REFERENCES "contract_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" DROP CONSTRAINT "FK_8738d9241715be3b519007907ed"`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "groupId"`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD "groupId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "note"`);
    }

}
