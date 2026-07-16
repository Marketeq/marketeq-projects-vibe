import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsolidateRateFields1777519381418 implements MigrationInterface {
    name = 'ConsolidateRateFields1777519381418'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Update users table
        await queryRunner.query(`ALTER TABLE "user_service"."users" ADD COLUMN IF NOT EXISTS "rate" numeric`);
        await queryRunner.query(`UPDATE "user_service"."users" SET "rate" = "rateMin" WHERE "rate" IS NULL`);
        await queryRunner.query(`ALTER TABLE "user_service"."users" DROP COLUMN IF EXISTS "rateMin"`);
        await queryRunner.query(`ALTER TABLE "user_service"."users" DROP COLUMN IF EXISTS "rateMax"`);

        // 2. Update talent_profiles table
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ADD COLUMN IF NOT EXISTS "rate" integer`);
        await queryRunner.query(`UPDATE "user_service"."talent_profiles" SET "rate" = "rateMin" WHERE "rate" IS NULL`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" DROP COLUMN IF EXISTS "rateMin"`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" DROP COLUMN IF EXISTS "rateMax"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback talent_profiles
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ADD COLUMN IF NOT EXISTS "rateMax" integer`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" ADD COLUMN IF NOT EXISTS "rateMin" integer`);
        await queryRunner.query(`UPDATE "user_service"."talent_profiles" SET "rateMin" = "rate"`);
        await queryRunner.query(`ALTER TABLE "user_service"."talent_profiles" DROP COLUMN IF EXISTS "rate"`);

        // Rollback users
        await queryRunner.query(`ALTER TABLE "user_service"."users" ADD COLUMN IF NOT EXISTS "rateMax" numeric`);
        await queryRunner.query(`ALTER TABLE "user_service"."users" ADD COLUMN IF NOT EXISTS "rateMin" numeric`);
        await queryRunner.query(`UPDATE "user_service"."users" SET "rateMin" = "rate"`);
        await queryRunner.query(`ALTER TABLE "user_service"."users" DROP COLUMN IF EXISTS "rate"`);
    }
}
