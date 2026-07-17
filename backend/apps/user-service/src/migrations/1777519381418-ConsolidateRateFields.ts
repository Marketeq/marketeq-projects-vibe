import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsolidateRateFields1777519381418 implements MigrationInterface {
    name = 'ConsolidateRateFields1777519381418'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Update users table
        await queryRunner.query(`ALTER TABLE "user_service"."users" ADD "rate" numeric`);
        await queryRunner.query(`UPDATE "user_service"."users" SET "rate" = "rateMin" WHERE "rate" IS NULL`);
        await queryRunner.query(`ALTER TABLE "user_service"."users" DROP COLUMN "rateMin"`);
        await queryRunner.query(`ALTER TABLE "user_service"."users" DROP COLUMN "rateMax"`);

        // 2. Update talent_profiles table
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ADD "rate" integer`);
        await queryRunner.query(`UPDATE "user_service"."talent_profiles" SET "rate" = "rateMin" WHERE "rate" IS NULL`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" DROP COLUMN "rateMin"`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" DROP COLUMN "rateMax"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback talent_profiles
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ADD "rateMax" integer`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ADD "rateMin" integer`);
        await queryRunner.query(`UPDATE "user_service"."talent_profiles" SET "rateMin" = "rate"`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" DROP COLUMN "rate"`);

        // Rollback users
        await queryRunner.query(`ALTER TABLE "user_service"."users" ADD "rateMax" numeric`);
        await queryRunner.query(`ALTER TABLE "user_service"."users" ADD "rateMin" numeric`);
        await queryRunner.query(`UPDATE "user_service"."users" SET "rateMin" = "rate"`);
        await queryRunner.query(`ALTER TABLE "user_service"."users" DROP COLUMN "rate"`);
    }
}
