import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveTalentProfileIsAvailable1778100000000 implements MigrationInterface {
    name = 'RemoveTalentProfileIsAvailable1778100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" DROP COLUMN "isAvailable"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ADD "isAvailable" boolean NOT NULL DEFAULT true`);
    }
}
