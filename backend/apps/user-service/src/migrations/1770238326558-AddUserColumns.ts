import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserColumns1770238326558 implements MigrationInterface {
    name = 'AddUserColumns1770238326558'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "availability" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rate_min" numeric`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rate_max" numeric`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "client_success_rating" numeric`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "repeat_hire_rate" numeric`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "response_time" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "response_time"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "repeat_hire_rate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "client_success_rating"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "rate_max"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "rate_min"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "availability"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "location"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
    }

}
