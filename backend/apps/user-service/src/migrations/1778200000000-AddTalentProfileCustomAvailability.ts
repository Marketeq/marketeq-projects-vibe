import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTalentProfileCustomAvailability1778200000000 implements MigrationInterface {
    name = 'AddTalentProfileCustomAvailability1778200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ALTER COLUMN "availability" TYPE varchar(20)`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ADD "customAvailability" jsonb DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" DROP COLUMN "customAvailability"`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ALTER COLUMN "availability" TYPE varchar(10)`);
    }
}
